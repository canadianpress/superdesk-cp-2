from asyncio import create_task, get_event_loop, sleep
from logging import getLogger
from re import compile
from typing import AsyncIterator

from quart import Response, request
from quart.json import dumps, loads
from superdesk import get_resource_service
from superdesk.auth.decorator import blueprint_auth
from superdesk.eve_async.service import AsyncBaseService
from superdesk.flask import Blueprint
from superdesk.resource import Resource
from superdesk.utils import get_cors_headers

logger = getLogger(__name__)

bp = Blueprint("research_tool", __name__, url_prefix="/api")


@bp.route("/research_tool/stream", methods=["GET", "OPTIONS"])
@blueprint_auth()
async def research_tool_stream():
    response = Response(
        _research_tool_generator(
            get_resource_service("research_tool"), request.args.get("q", "")
        ),
        mimetype="text/event-stream",
    )
    response.headers.update([*get_cors_headers(["GET"]), ("Cache-Control", "no-cache")])

    return response


CITATION_REGEX = compile(r"\[\[(\d+)\]\((https?://[^\s)]+)\)\]")
WINDOW_SIZE = 500


async def _research_tool_generator(service, query):
    window = ""
    async for item in service.get_all_batch_async(lookup={"query": query}):
        if "data: " not in item:
            yield item
            continue

        try:
            data = await get_event_loop().run_in_executor(
                None, loads, item.split("data: ")[1].strip()
            )
            window += data.get("response", {}).get("delta", "")
            match = await get_event_loop().run_in_executor(
                None, CITATION_REGEX.search, window
            )
            if match:
                citation_id, uri = match.groups()
                logger.info(f"CITATION FOUND: {citation_id} {uri}")
                create_task(_fetch_article(citation_id, uri))
                data = {
                    "citation_id": citation_id,
                    "uri": uri,
                    "slugline": f"slugline-{citation_id}",
                    "headline": f"headline-{citation_id}",
                    "description": f"description-{citation_id}",
                    "date_published": f"date_published-{citation_id}",
                    "language": f"language-{citation_id}",
                    "source": f"source-{citation_id}",
                    "type": f"type-{citation_id}",
                }
                yield f"event: response.citation\ndata: {dumps(data)}\n\n"
                window = window[match.end() :]
            elif len(window) > WINDOW_SIZE:
                window = window[-WINDOW_SIZE // 2 :]
        except (IndexError, ValueError):
            pass

        yield item

    yield "event: done\ndata: \n\n"


async def _fetch_article(guid, uri):
    pass


class ResearchToolResource(Resource):
    endpoint_name = "research_tool"
    resource_methods = ["GET"]
    schema = {
        "iteration": {"type": "integer"},
        "status": {
            "type": "string",
        },
    }
    privileges = {
        "GET": "archive",
    }


class ResearchToolService(AsyncBaseService):
    async def get_all_batch_async(
        self, size=500, max_iterations=10000, lookup=None
    ) -> AsyncIterator[dict]:
        yield 'event: response.created\ndata: {"seq_id": 0, "type": "response.created"}\n\n'
        yield 'event: response.starting\ndata: {"seq_id": 1, "type": "response.starting"}\n\n'

        deltas = [
            "A look",
            " at Prime",
            " Minister Mark",
            " Carney",
            "\n\nMark",
            " Carney is Canada",
            "'s 24",
            "th prime",
            " minister,",
            " having",
            " been",
            " sworn in on March 14, ",
            "2025,",
            " after",
            " winning the Liberal Party",
            " leadership in",
            " a land",
            "slide vote",
            " [[",
            "21",
            "](http://cp.org/6",
            "f5681c8-c528",
            "-44d3-9aed",
            "-d46fcee097d0",
            ")].",
            "\n\n**Born",
            ":** March 16",
            ", 1965",
            ", in Fort",
            " Smith",
            ", N",
            ".W",
            ".T. [[60",
            "](http://cp.org/31",
            "d3bba2-cd49",
            "-4bce-af8c",
            "-ccfff14f227c",
            ")].",
            "\n\n**Early years",
            ":** Carney was",
            " raised",
            " Catholic",
            " in",
            " Edmonton",
            ", where",
            " he worked",
            " as a paper",
            " boy for",
            " the Edmonton Journal when",
            " he lived",
            " in the city's",
            " west",
            " end [[60](http://cp.",
            "org/31d3bba2",
            "-cd49-4bce-",
            "af8c-ccfff14",
            "f227c)]. He spent",
            " his early",
            " childhood in Fort",
            " Smith, south",
            " of",
            " Yellowknife along",
            " the Alberta",
            " boundary",
            ",",
            " before moving with",
            " his family to Edmonton",
            " [[",
            "56",
            "](http://cp.org/8",
            "231",
            "d",
            "6",
            "c",
            "3",
            "-b",
            "5",
            "ce",
            "-471",
            "b",
            "-b",
            "8",
            "e",
            "7-387",
            "247",
            "ca",
            "ba",
            "ef",
            ")].",
            " He studied",
            " economics",
            " abroad",
            ",",
            " obtaining",
            " a bachelor",
            "'s degree from Harvard",
            " University and",
            " a master's and",
            " a",
            " doctorate",
            " from Oxford",
            " [[",
            "60](http://cp.org/",
            "31d3bba2-cd",
            "49-4bce-af8",
            "c-ccfff14f227",
            "c)]. At",
            " Harvard",
            ", he played",
            " hockey",
            " as",
            " a backup",
            " goalie",
            " [[",
            "60](http://cp.org/",
            "31d3bba2-cd",
            "49-4bce-af8",
            "c-ccfff14f227",
            "c)].",
            "\n\n**Family:** He",
            " is",
            " married to Diana",
            " Fox",
            " Carney, a climate",
            " and",
            " finance",
            " policy",
            " consultant",
            " at",
            " the",
            " Eur",
            "asia Group who",
            " works",
            " with",
            " Gerald",
            " Butts, a",
            " former top",
            " aide to Justin",
            " Trudeau [[61",
            "](http://cp.org/31",
            "d3bba2-cd49",
            "-4bce-af8c",
            "-ccfff14f227c",
            ")]. The Carneys have four",
            " children [[61](http://cp.",
            "org/31d3bba2",
            "-cd49-4bce-",
            "af8c-ccfff14",
            "f227c)]. His father Bob",
            " Carney, a teacher, notably",
            " once ran under the Liberal banner (unsuccess",
            "fully) for the Edmonton\u2014South seat",
            " in the 1980s [[61",
            "](http://cp.org/31",
            "d3bba2-cd49",
            "-4bce-af8c",
            "-ccfff14f227c",
            ")",
            "].\n\n**Career:** Carney",
            " spent 13 years at the global",
            " investment banking firm Goldman Sachs in",
            " its London, New York, Tokyo and Toronto offices before becoming the Bank of Canada's deputy governor in 2003 [[60](http://cp.org/31d3bba2-cd49-4bce-af8c-ccfff14f227c)]. He served as Canada's central bank governor from 2008 to 2013 and then became the first non-Briton to lead the Bank of England from 2013 to 2020 [[57](http://cp.org/29729606-f18c-4a39-9d62-108a74e76cc3)]. Most recently, Carney has served as an advisory board chair to the progressive liberal think-tank Canada 2020 and was named the United Nations' special envoy on climate change in 2019 [[58](http://cp.org/3f6cc79e-4e3d-4c31-9a7e-4054942b1016)]. In 2020, he became vice-chair at Brookfield Asset Management [[59](http://cp.org/1c52b271-e63d-4537-8890-0f33965582c6)]. He also served as an external member of the board for the payment-processing financial tech company Stripe and sat on the foundation board of the World Economic Forum [[61](http://cp.org/31d3bba2-cd49-4bce-af8c-ccfff14f227c)]. When he launched his Liberal leadership campaign on Jan. 16, he said he had resigned from those roles to avoid conflicts of interest [[61](http://cp.org/31d3bba2-cd49-4bce-af8c-ccfff14f227c)]. Carney is a longtime proponent of carbon pricing but has backed away from the consumer-facing carbon tax in response to political backlash [[61](http://cp.org/31d3bba2-cd49-4bce-af8c-ccfff14f227c)].",
            '\n\n**Quote:** "I',
            " feel",
            " like",
            " everything",
            " in",
            " my",
            " life",
            " has",
            " helped",
            " prepare",
            " me",
            " for",
            " this",
            " moment",
            ',"',
            " he",
            " said",
            " on",
            " March",
            " 9",
            ",",
            " after",
            " his",
            " decisive",
            " Liberal",
            " leadership",
            " victory",
            " [[",
            "62",
            "](http://cp.org/6",
            "f5681c8-c528",
            "-44d3-9aed",
            "-d46fcee097d0",
            ")].",
            "\n\n*This report by The Canadian Press was first published March 22, 2025.*",
            "\n\n---\n\n**Sources**\n\n\n[14] **Mark Carney rencontrera Donald Trump mardi**  \nCARNEY-TRUMP-RENCONTRE | 2025-05-02 15:57:36 UTC | fr-CA | La Presse Canadienne | Broadcast, Print  \nhttp://cp.org/e49c9883-a152-47d4-8e36-b66bacbebec1\n\nLe premier ministre Mark Carney se rendra \u00e0 Washington ce mardi pour rencontrer le pr\u00e9sident am\u00e9ricain Donald Trump, pour la premi\u00e8re fois depuis les \u00e9lections f\u00e9d\u00e9rales du 28 avril. Les deux dirigeants devraient discuter de la guerre commerciale de Donald Trump contre le Canada, et ces discussions pourraient ouvrir la voie \u00e0 des n\u00e9gociations sur un nouvel accord de commerce et de s\u00e9curit\u00e9 avec les \u00c9tats-Unis. M. Carney en a fait l'annonce vendredi, en conf\u00e9rence de presse, la premi\u00e8re depuis M. Carney a obtenu un gouvernement minoritaire \u00e0 l'occasion de ses premi\u00e8res \u00e9lections, lundi. Mark Carney a fait campagne en se pr\u00e9sentant comme le candidat le mieux plac\u00e9 pour faire face aux efforts acharn\u00e9s de M. Trump visant \u00e0 r\u00e9tablir l'industrie manufacturi\u00e8re, par l'entremise de taxes massives sur les importations, et aux d\u00e9clarations mena\u00e7antes du pr\u00e9sident visant \u00e0 faire du Canada un \u00c9tat am\u00e9ricain. Le pr\u00e9sident Trump a att\u00e9nu\u00e9 ses propos agressifs pendant la campagne \u00e9lectorale et a r\u00e9cemment qualifi\u00e9 M. Carney de \u00abtr\u00e8s gentil monsieur\u00bb. L'ancien premier ministre Justin Trudeau a pass\u00e9 ses derniers jours au pouvoir \u00e0 \u00eatre fr\u00e9quemment piqu\u00e9 par M. Trump, qui a \u00e9voqu\u00e9 l'annexion et l'augmentation des tarifs douaniers.\n\n[21] **NewsAlert: Mark Carney sworn in as prime minister**  \nCarney-Cabinet | 2025-03-14 15:25:51 UTC | en-CA | The Canadian Press | Broadcast, Print  \nhttp://cp.org/6f5681c8-c528-44d3-9aed-d46fcee097d0\n\nMark Carney has been officially sworn in as Canada's 24th prime minister in a ceremony at Rideau Hall. Carney took the oath of office shortly after 11 a.m., about an hour after Justin Trudeau formally resigned. More coming.\n\n[42] **Mark Carney sworn in as MP for Nepean**  \nCarney-Parliament | 2025-05-22 15:30:43 UTC | en-CA | The Canadian Press | Print  \nhttp://cp.org/808865c4-7ab8-4bf0-b3cd-bf689d7a19cd\n\nPrime Minister Mark Carney was officially sworn in as a member of Parliament Thursday, and will take his seat in the House of Commons for the first time on May 26. Carney swore allegiance to King Charles in a ceremony on Parliament Hill Thursday morning, three weeks after voters elected him in the Ottawa riding of Nepean. House of Commons clerk Eric Janse presided over the short ceremony, during which Carney said he will do his best to represent his constituents. The prime minister was given a special lapel pin that is worn by MPs for security access in Ottawa. \"In fact, even as prime minister, if you were to try to enter the chamber on Monday without having been sworn in, the sergeant-at-arms would deny you access,\" Janse joked. The prime minister thanked members of his riding campaign team who attended his swearing-in. About three dozen guests were present, including Marco Mendicino, Carney's chief of staff. Following the ceremony Carney took a group photo and received several gifts from his guests. Those included a commemorative coin from the 4 Nations Face-Off hockey tournament that Canada won earlier this year, and a loonie that was placed at centre ice in one of the rinks. He was also given a bouquet of tulips, the official flower of Ottawa. Carney said he'll spend Friday working in the riding and plans to have breakfast with Ottawa Mayor Mark Sutcliffe. Parliament returns on Monday, and will start with the election of a speaker. On Tuesday, King Charles will read the speech from the throne in the Senate chamber on Tuesday. King Charles and Queen Camilla arrive for a short visit to Canada on Monday. This report by The Canadian Press was first published May 22, 2025.\n\n[55] **Mark Carney to be sworn in as PM Friday**  \nCarney-Transition | 2025-03-12 22:55:59 UTC | en-CA | The Canadian Press | Broadcast, Print  \nhttp://cp.org/f135b979-b6c2-4e21-b13f-9b86158ad074\n\nMark Carney will be sworn in as Canada's 24th prime minister at a ceremony at Rideau Hall Friday after the formal resignation of Justin Trudeau. The Governor General's office announced late Wednesday the swearing-in ceremony for Carney and his new cabinet will take place at 11 a.m. ET in the Rideau Hall ballroom. Carney, who was selected as Liberal leader Sunday in a landslide vote, has promised a \"seamless\" and \"quick\" transition. Carney captured nearly 86 per cent of the Liberal vote, far ahead of opponents Chrystia Freeland (who got eight per cent), Karina Gould (3.2 per cent) and Frank Baylis, who came in last with three per cent. Carney has already been meeting with seniors officials, including Canada's Chief of the Defence Staff Jennie Carignan, PMO staff and Canada's ambassador to the U.S. Kirsten Hillman. When Trudeau announced his plans to resign in January, Parliament was prorogued until March 24. A federal election call is widely expected soon after Carney is installed as prime minister before the House of Commons returns. Carney, who has never been elected, has not said which riding he intends to seek election for a seat. The Liberals have recently rebounded in the polls after lagging behind the Conservatives for nearly two years. A new Leger poll suggests the federal Liberals and the Conservatives are running neck-and-neck in voter support. The poll of Canadians\u2019 voting intentions, released this week, has both parties sitting at 37 per cent. The survey was conducted online and cannot be assigned a margin of error. It shows a drop of six points for the Conservatives and a seven per cent jump for Liberals since Feb. 24, while the NDP is down two per cent to 11 per cent. Leger surveyed 1,548 Canadians between March 7 and March 10 \u2014 which means the poll wrapped up just after Liberals picked Mark Carney as the new party leader and prime minister-designate. \u2014 With files from Anja Karadeglija This report by The Canadian Press was first published March 12, 2025.\n\n[56] **Carney visits Northwest Territories birthplace**  \nCarney-NWT | 2025-07-24 01:09:11 UTC | en-CA | The Canadian Press | Print  \nhttp://cp.org/8231d6c3-b5ce-471b-b8e7-387247cabaef\n\nPrime Minister Mark Carney visited the town where he was born Wednesday, as he travels across the Northwest Territories. Carney spent his early childhood in Fort Smith, south of Yellowknife along the Alberta boundary, before he moved with his family to Edmonton. On Wednesday he visited the town's community centre, spoke with children attending a local summer camp and discussed affordability issues and employment with their parents. In the lobby, a woman held a sign expressing opposition to Bill C-5, the government's major projects legislation. He also spoke with passersby in the town and with locals gathered at the local Berro's Pizza restaurant, where a meat-topped pizza had been rebranded as the \"Carneyvore.\" Carney also met with Northwest Territories Premier R.J. Simpson and discussed wildfires with community leaders. He was set to head to Inuvik in the territory's northwest corner in late afternoon Wednesday. The prime minister is set to co-host the Inuit-Crown Partnership Committee on Thursday with Natan Obed, president of Inuit Tapiriit Kanatami, a national organization representing Inuit. It will be Carney's second meeting with Indigenous groups on Bill C-5, which gives Ottawa the ability to fast-track projects it deems to be in the national interest by sidestepping some review requirements. \u2014 Written by Dylan Robertson in Ottawa and Jeff McIntosh in Fort Smith This report by The Canadian Press was first published July 23, 2025.\n\n[60] **Quick Sketch: Liberal leader Mark Carney**  \nFedElxn-QuickSketch-Carney | 2025-03-23 19:08:57 UTC | en-CA | The Canadian Press | Print, Quick Sketch  \nhttp://cp.org/31d3bba2-cd49-4bce-af8c-ccfff14f227c\n\nPrime Minister Mark Carney's first official week on the job was a whirlwind that included a trip to Europe and Canada's North. His second promises to be far more challenging. Carney is heading into his first-ever general election as the leader of what was, until very recently, a political party headed for electoral disaster. He's seeking a very rare fourth term for the governing Liberals and his first seat in Parliament. He launched his bid to replace Justin Trudeau at the helm of the Liberal party in Edmonton, Alta. just a few months ago and won resoundingly on March 9. Here's a quick look at his background. Born: March 16, 1965, in Fort Smith, N.W.T. Early years: Carney was raised Catholic in Edmonton. He worked as a paper boy for the Edmonton Journal when he lived in the city's west end. He studied economics abroad, obtaining a bachelor\u2019s degree from Harvard University and a master\u2019s and a doctorate from Oxford. At Harvard, he played hockey as a backup goalie; his friends say he has always placed a high value on sports and physical fitness. Career history: Carney spent 13 years at the global investment banking firm Goldman Sachs in its London, New York, Tokyo and Toronto offices. He held senior positions at the Bank of Canada and in the federal finance department in Ottawa until he was appointed governor of the Bank of Canada in 2008. There he directed the country's monetary policy throughout the global financial crisis. After the Liberals parted ways with leader Michael Ignatieff when the party floundered in the 2011 federal election, Carney's name was floated as a potential successor. But he never confirmed his interest and, when a reporter asked him in 2012 whether he had political ambitions, he responded with a joke: \"Why don't I become a circus clown?\" On July 1, 2013, Carney succeeded Sir Mervyn King as governor of the Bank of England and helped to guide the U.K.'s economic and monetary policy in the chaotic wake of the Brexit vote. His term ended in March 2020. Carney has served as an advisory board chair to the progressive liberal think-tank Canada 2020 and was named the United Nations' special envoy on climate change in 2019. In 2020, he became vice-chair at Brookfield Asset Management. He also served as an external member of the board for the payment-processing financial tech company Stripe and sat on the foundation board of the World Economic\n\n[61] **Quick Sketch: Liberal leader Mark Carney**  \nFedElxn-QuickSketch-Carney | 2025-03-23 19:08:57 UTC | en-CA | The Canadian Press | Print, Quick Sketch  \nhttp://cp.org/31d3bba2-cd49-4bce-af8c-ccfff14f227c\n\n2013, Carney succeeded Sir Mervyn King as governor of the Bank of England and helped to guide the U.K.'s economic and monetary policy in the chaotic wake of the Brexit vote. His term ended in March 2020. Carney has served as an advisory board chair to the progressive liberal think-tank Canada 2020 and was named the United Nations' special envoy on climate change in 2019. In 2020, he became vice-chair at Brookfield Asset Management. He also served as an external member of the board for the payment-processing financial tech company Stripe and sat on the foundation board of the World Economic Forum. When he launched his Liberal leadership campaign on Jan. 16, he said he had resigned from those roles to avoid conflicts of interest. Carney is a longtime proponent of carbon pricing but has backed away from the consumer-facing carbon tax in response to political backlash. Family: He is married to Diana Fox Carney, a climate and finance policy consultant at the Eurasia Group who works with Gerald Butts, a former top aide to Trudeau. The Carneys have four children. His father Bob Carney, a teacher, notably once ran under the Liberal banner (unsuccessfully) for the Edmonton\u2014South seat in the 1980s. Quote: \"I feel like everything in my life has helped prepare me for this moment,\" he said on March 9, after his decisive Liberal leadership victory. This report by The Canadian Press was first published March 22, 2025.",
        ]

        for i, word in enumerate(deltas, start=2):
            payload = {
                "seq_id": i,
                "type": "response.output_text.delta",
                "response": {
                    "output_index": 0,
                    "type": "message.answer",
                    "delta": word,
                },
            }
            yield f"id: {i}\nevent: response.output_text.delta\ndata: {dumps(payload)}\n\n"
            await sleep(0.2)


def init_app(app):
    from superdesk import blueprint, register_resource

    register_resource(
        "research_tool", ResearchToolResource, ResearchToolService, _app=app
    )
    blueprint(bp, app)
