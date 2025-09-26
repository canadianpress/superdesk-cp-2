import logging
import time
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, List

import requests
from flask import current_app as app
import superdesk
from superdesk.utils import ListCursor
from superdesk.search_provider import SearchProvider

logger = logging.getLogger(__name__)


class ArchiveListCursor(ListCursor):
    def __init__(self, docs, count):
        super().__init__(docs)
        self._count = count

    def __len__(self):
        return len(self.docs)

    def count(self, **kwargs):
        return self._count


class ArchiveSearchProvider(SearchProvider):
    label = "Archive Search"

    def __init__(self, provider):
        super().__init__(provider)
        self.config = provider.get("config") or {}

        self.api_base = app.config.get("ARCHIVE_SEARCH_API_BASE_URL", "").rstrip("/")
        self.api_path = app.config.get("ARCHIVE_SEARCH_API_SEARCH_PATH", "/search")
        self.api_key = app.config.get("ARCHIVE_SEARCH_API_KEY", "")

        if not self.api_base:
            raise RuntimeError("ARCHIVE_SEARCH_API_BASE_URL is not configured")

        self.timeout_seconds = int(
            app.config.get("ARCHIVE_SEARCH_API_TIMEOUT_SECONDS", 15)
        )
        self.max_retries = int(app.config.get("ARCHIVE_SEARCH_API_MAX_RETRIES", 3))
        self.retry_min_sleep = float(
            app.config.get("ARCHIVE_SEARCH_API_RETRY_MIN", 0.2)
        )
        self.retry_max_sleep = float(
            app.config.get("ARCHIVE_SEARCH_API_RETRY_MAX", 0.8)
        )

        self.search_profile = app.config.get("ARCHIVE_SEARCH_PROFILE", None)

        logger.info(
            "ArchiveSearchProvider using API: %s%s (timeout=%ss, retries=%d)",
            self.api_base,
            self.api_path,
            self.timeout_seconds,
            self.max_retries,
        )

    @staticmethod
    def _format_sd_iso(value) -> str:
        if not value:
            return ""
        s = str(value).strip()
        try:
            if s.endswith("Z"):
                s = s[:-1] + "+00:00"
            if len(s) == 10 and s[4] == "-" and s[7] == "-":
                s = s + "T00:00:00+00:00"
            from datetime import datetime, timezone

            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%S%z")
        except Exception:
            return ""

    def find(self, query, params):
        try:
            logger.info("Frontend query=%s params=%s", query, params)

            size = int((query or {}).get("size", 50))
            frm = int((query or {}).get("from", 0))

            p = dict(params or {})

            if not any(
                bool((p.get(k) or "").strip())
                for k in (
                    "query_text",
                    "headline",
                    "story_text",
                    "slugline",
                    "slugline_exact",
                )
            ):
                lifted = self._extract_query_text_from_es(query or {})
                if lifted:
                    p["query_text"] = lifted

            if not str(p.get("sort", "")).strip():
                es_sort = (query or {}).get("sort")
                if isinstance(es_sort, list) and es_sort:
                    first = es_sort[0]
                    if isinstance(first, dict) and first:
                        field, direction = next(iter(first.items()))
                        fld = str(field).lower()
                        dir_ = "asc" if str(direction).lower() == "asc" else "desc"
                        if fld in ("versioncreated", "firstcreated"):
                            p["sort"] = f"{fld}:{dir_}"

            api_params = self._build_api_params(params=p, size=size, frm=frm)

            logger.info("Final API params: %s", api_params)

            items, total = self._api_search(api_params)
            logger.info("API returned %d items of total %s", len(items), total)

            return ArchiveListCursor(self._transform_items(items), total)
        except Exception:
            logger.exception("Archive API search failed")
            return ArchiveListCursor([], 0)

    def _headers(self) -> Dict[str, str]:
        h = {
            "Accept": "application/json",
            "User-Agent": "cp-archive-search-provider/1.0",
        }
        if self.api_key:
            h["x-api-key"] = self.api_key
        return h

    @staticmethod
    def _extract_query_text_from_es(es_query: dict) -> str:
        try:
            q = es_query or {}
            node = q.get("query") or {}
            if "filtered" in node:
                node = node["filtered"].get("query") or {}

            if isinstance(node, dict):
                if "query_string" in node and isinstance(node["query_string"], dict):
                    s = node["query_string"].get("query")
                    if isinstance(s, str) and s.strip():
                        return s.strip()
                if "simple_query_string" in node and isinstance(
                    node["simple_query_string"], dict
                ):
                    s = node["simple_query_string"].get("query")
                    if isinstance(s, str) and s.strip():
                        return s.strip()
        except Exception:
            pass
        return ""

    def _pick_dates(
        self, params: Dict[str, Any], es_query: Dict[str, Any]
    ) -> tuple[Optional[str], Optional[str]]:
        def _looks_like_date(v: Any) -> bool:
            if not isinstance(v, str):
                return False
            s = v.strip()
            return (len(s) == 10 and s[4] == "-" and s[7] == "-") or ("T" in s)

        def _ymd(s: str) -> Optional[str]:
            if not s:
                return None
            s = str(s).strip()
            if len(s) >= 10 and s[4] == "-" and s[7] == "-":
                return s[:10]
            if "T" in s:
                return s.split("T", 1)[0]
            return None

        if params.get("date"):
            d = _ymd(params["date"])
            if d:
                return d, d

        pf = _ymd(params.get("from_date", ""))
        pt = _ymd(params.get("to_date", ""))
        if pf or pt:
            return pf, pt

        raw_from = params.get("from")
        raw_to = params.get("to")
        pf = _ymd(raw_from) if (raw_from and _looks_like_date(raw_from)) else None
        pt = _ymd(raw_to) if (raw_to and _looks_like_date(raw_to)) else None
        if pf or pt:
            return pf, pt

        try:

            def _scan(obj):
                if isinstance(obj, dict):
                    if "range" in obj and isinstance(obj["range"], dict):
                        rng = obj["range"]
                        for field in ("versioncreated", "firstcreated"):
                            if field in rng and isinstance(rng[field], dict):
                                r = rng[field]
                                gte = r.get("gte") or r.get("from")
                                lte = r.get("lte")
                                lt = r.get("lt")
                                df = _ymd(str(gte)) if gte else None
                                dt = (
                                    _ymd(str(lte))
                                    if lte
                                    else (_ymd(str(lt)) if lt else None)
                                )
                                if df or dt:
                                    return df, dt
                    for v in obj.values():
                        found = _scan(v)
                        if found:
                            return found
                elif isinstance(obj, list):
                    for v in obj:
                        found = _scan(v)
                        if found:
                            return found
                return None

            found = _scan(es_query)
            if found:
                return found
        except Exception:
            pass

        return None, None

    def _build_api_params(
        self, params: Dict[str, Any], size: int, frm: int
    ) -> Dict[str, Any]:
        def _normalize_sort(s: str) -> str | None:
            if not isinstance(s, str) or ":" not in s:
                return None
            fld, dir_ = s.split(":", 1)
            fld = (fld or "").strip().lower()
            dir_ = (dir_ or "").strip().lower()
            return f"{fld}:{dir_}"

        default_sort = str(
            app.config.get("ARCHIVE_SEARCH_DEFAULT_SORT", "versioncreated:desc")
        ).strip()
        out: Dict[str, Any] = {
            "limit": size,
            "from": max(0, int(frm)),
            "types": "text",
        }

        out["sort"] = (
            _normalize_sort(params.get("sort", ""))
            or _normalize_sort(default_sort)
            or "versioncreated:desc"
        )

        qtext = (params.get("query_text") or "").strip()
        hq = (params.get("headline") or "").strip()
        bq = (params.get("story_text") or "").strip()
        sexact = (params.get("slugline_exact") or "").strip()
        sq = (params.get("slugline") or "").strip()
        use_phrase = bool(params.get("use_phrase", False))
        byline = (params.get("byline") or "").strip()

        if qtext:
            out["text"] = qtext
        if hq:
            out["headline"] = hq
        if bq:
            out["text"] = bq
        if sexact:
            out["slugline"] = sexact
            out["phrase"] = True
        elif sq:
            out["slugline"] = sq
        if use_phrase:
            out["phrase"] = True
        if byline:
            out["byline"] = byline

        def looks_like_date(s: Any) -> bool:
            if not isinstance(s, str):
                return False
            s = s.strip()
            return len(s) >= 10 and s[4] == "-" and s[7] == "-"

        def ymd(s: str) -> str:
            return s.strip()[:10]

        if params.get("date"):
            dd = str(params["date"]).strip()
            if looks_like_date(dd):
                out["from_date"] = ymd(dd)
                out["to_date"] = ymd(dd)

        if params.get("from_date"):
            fd = str(params["from_date"]).strip()
            if looks_like_date(fd):
                out["from_date"] = ymd(fd)
        if params.get("to_date"):
            td = str(params["to_date"]).strip()
            if looks_like_date(td):
                out["to_date"] = ymd(td)

        raw_from = params.get("from")
        raw_to = params.get("to")
        logger.info(
            "Provider received date-ish from/to? from=%r to=%r", raw_from, raw_to
        )

        if raw_from and looks_like_date(raw_from):
            out["from_date"] = ymd(raw_from)
        if raw_to and looks_like_date(raw_to):
            out["to_date"] = ymd(raw_to)

        no_text = not any([qtext, hq, bq, sexact, sq, byline])
        no_dates = not any([out.get("from_date"), out.get("to_date")])
        if no_text and no_dates:
            recent_days = int(app.config.get("ARCHIVE_SEARCH_DEFAULT_RECENT_DAYS", 30))
            today = datetime.utcnow().date()
            out["from_date"] = (today - timedelta(days=recent_days)).isoformat()
            out["to_date"] = (today + timedelta(days=1)).isoformat()

        def _as_list(v):
            if v is None:
                return []
            if isinstance(v, (list, tuple)):
                return [str(x).strip() for x in v if str(x).strip()]
            s = str(v).strip()
            if not s:
                return []
            if "," in s:
                return [x.strip() for x in s.split(",") if x.strip()]
            return [s]

        cats = _as_list(params.get("categories"))
        if cats:
            out["categories"] = cats

        dist = _as_list(params.get("distribution"))
        if dist:
            out["distribution"] = dist

        langs = _as_list(params.get("languages"))
        if langs:
            out["languages"] = langs

        byline = (params.get("byline") or "").strip()
        if byline:
            out["byline"] = byline

        srcs = _as_list(params.get("source"))
        if srcs:
            out["source"] = srcs

        return out

    def _api_search(self, api_params: Dict[str, Any]) -> (List[Dict[str, Any]], int):
        url = f"{self.api_base}{self.api_path}"
        last_err = None

        send_params = dict(api_params)
        for k in ("categories", "distribution", "languages", "source"):
            v = send_params.get(k)
            if isinstance(v, (list, tuple)):
                send_params[k] = ",".join(str(x).strip() for x in v if str(x).strip())

        try:
            import json

            logger.info("API params: %s", json.dumps(send_params, sort_keys=True))
        except Exception:
            pass

        for attempt in range(1, self.max_retries + 1):
            try:
                req = requests.Request(
                    "GET", url, headers=self._headers(), params=send_params
                )
                prepared = req.prepare()
                logger.info("API call (attempt %d): %s", attempt, prepared.url)

                resp = requests.Session().send(prepared, timeout=self.timeout_seconds)
                if 200 <= resp.status_code < 300:
                    data = resp.json() if resp.content else {}
                    items, total = self._normalize_api_response(data)
                    return items, total
                elif resp.status_code in (429, 502, 503, 504):
                    last_err = RuntimeError(
                        f"Retryable status {resp.status_code}: {resp.text[:200]}"
                    )
                    sleep_s = self._jitter_sleep(attempt)
                    logger.warning(
                        "Retryable API error %s; sleeping %.2fs",
                        resp.status_code,
                        sleep_s,
                    )
                    time.sleep(sleep_s)
                    continue
                else:
                    raise RuntimeError(
                        f"Archive API error {resp.status_code}: {resp.text[:500]}"
                    )
            except (requests.Timeout, requests.ConnectionError) as e:
                last_err = e
                sleep_s = self._jitter_sleep(attempt)
                logger.warning(
                    "Archive API network error (%s); sleeping %.2fs", str(e), sleep_s
                )
                time.sleep(sleep_s)
                continue
            except Exception as e:
                if attempt < self.max_retries:
                    last_err = e
                    sleep_s = self._jitter_sleep(attempt)
                    logger.warning(
                        "Archive API unexpected error (%s); retry in %.2fs",
                        str(e),
                        sleep_s,
                    )
                    time.sleep(sleep_s)
                    continue
                raise

        if last_err:
            raise last_err
        return [], 0

    def _normalize_api_response(
        self, data: Dict[str, Any]
    ) -> (List[Dict[str, Any]], int):
        items = []
        total = 0

        if isinstance(data, dict):
            if isinstance(data.get("items"), list):
                items = data["items"]
            elif isinstance(data.get("hits"), list):
                items = data["hits"]
            elif isinstance(data.get("results"), list):
                items = data["results"]

            if isinstance(data.get("total"), int):
                total = data["total"]
            elif isinstance(data.get("total"), dict) and isinstance(
                data["total"].get("value"), int
            ):
                total = data["total"]["value"]
            elif isinstance(data.get("total_count"), int):
                total = data["total_count"]
            else:
                total = len(items)

        normalized_items = []
        for it in items:
            if "item" in it and isinstance(it["item"], dict):
                normalized_items.append(it)
            else:
                if isinstance(it, dict) and any(
                    k in it for k in ("uri", "type", "headlines", "bodies")
                ):
                    normalized_items.append({"item": it})
                else:
                    normalized_items.append(it)
        return normalized_items, int(total)

    def _jitter_sleep(self, attempt: int) -> float:
        base = min(self.retry_max_sleep, self.retry_min_sleep * (2 ** (attempt - 1)))
        return random.uniform(self.retry_min_sleep, base)

    @staticmethod
    def _parse_date_ymd(s: str) -> Optional[datetime]:
        try:
            d = datetime.strptime(s, "%Y-%m-%d")
            return d.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    @staticmethod
    def _parse_iso(s: str) -> Optional[datetime]:
        try:
            if len(s) == 10 and s[4] == "-" and s[7] == "-":
                return ArchiveSearchProvider._parse_date_ymd(s)
            if s.endswith("Z"):
                s = s[:-1] + "+00:00"
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            return None

    def _transform_items(self, items):
        def get_nested(obj, path, default=""):
            try:
                for key in path:
                    obj = obj[key]
                return obj
            except (KeyError, IndexError, TypeError):
                return default

        def pick_headline_from_arrays(headlines, role):
            if not isinstance(headlines, list):
                return ""
            return next(
                (h.get("value", "") for h in headlines if h.get("role") == role), ""
            )

        def pick_any_headline(headlines):
            if not isinstance(headlines, list):
                return ""
            return next((h.get("value", "") for h in headlines if "value" in h), "")

        def pick_body_from_arrays(bodies):
            if not isinstance(bodies, list):
                return ""
            html = next(
                (b.get("value") for b in bodies if b.get("role") == "html"), None
            )
            if html:
                return html
            return next(
                (b.get("value") for b in bodies if b.get("role") == "text"), ""
            )  # fallback

        def prefer_top_level(whole: dict, data: dict, key: str, default=""):
            v = whole.get(key)
            if v is None or v == "":
                v = data.get(key, default)
            return v if v is not None else default

        transformed = []
        for whole in items:
            data = whole.get("item", {}) if isinstance(whole, dict) else {}

            hl_ext = (
                whole.get("headline_extended") or data.get("headline_extended") or ""
            )
            hl_main = whole.get("headline_main") or data.get("headline_main") or ""
            body_html = whole.get("body_html") or data.get("body_html") or ""

            if not hl_ext or not hl_main or not body_html:
                headlines = data.get("headlines", []) or []
                bodies = data.get("bodies", []) or []
                if not hl_ext:
                    hl_ext = pick_headline_from_arrays(headlines, "extended") or ""
                if not hl_main:
                    hl_main = (
                        pick_headline_from_arrays(headlines, "main")
                        or pick_any_headline(headlines)
                        or ""
                    )
                if not body_html:
                    body_html = pick_body_from_arrays(bodies) or ""

            legacy_headline = hl_ext or hl_main

            descriptions = data.get("descriptions", [])
            description = ""
            if isinstance(descriptions, list) and descriptions:
                description = descriptions[0].get("value", "")

            source = get_nested(data, ["infosources", 0, "name"])
            byline = data.get("by") or whole.get("by") or ""
            wordcount = whole.get("wordcount")
            if not isinstance(wordcount, int):
                wordcount = data.get("wordcount")
            if not isinstance(wordcount, int):
                wordcount = 0
            language = prefer_top_level(whole, data, "language", "")
            located = prefer_top_level(whole, data, "located", "")

            transformed.append(
                {
                    "guid": data.get("uri", ""),
                    "type": data.get("type", ""),
                    "headline": legacy_headline or "",
                    "headline_extended": hl_ext or "",
                    "headline_main": hl_main or "",
                    "description_text": (description[:200] + "...")
                    if description
                    else "",
                    "versioncreated": self._format_sd_iso(data.get("versioncreated")),
                    "slugline": data.get("slugline", ""),
                    "firstcreated": data.get("firstcreated"),
                    "urgency": data.get("urgency"),
                    "version": data.get("version", ""),
                    "body_html": body_html or "",
                    "source": source,
                    "state": "published",
                    "language": language,
                    "byline": byline or "",
                    "located": located,
                    "wordcount": wordcount,
                }
            )
        return transformed


def init_app(app):
    logger.info("=== Initializing Archive Search Provider===")
    try:
        superdesk.register_search_provider(
            "archive_search", provider_class=ArchiveSearchProvider
        )
        logger.info("Archive Search Provider registered successfully")
    except Exception:
        logger.exception("Failed to register Archive Search Provider")
    logger.info("=== End Archive Search Provider Initialization ===")
