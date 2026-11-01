import type {Card, Choice, DimKey, Style} from '../engine/types';
import pack from '../data/episodes.pack.json';
const safe=(text:string,extra:Partial<Choice>={}):Choice=>({text,delta:{nav:-1,trust:1,risk:3,research:1},risk:-1,...extra});
const bold=(text:string,extra:Partial<Choice>={}):Choice=>({text,delta:{nav:3,trust:2,risk:-3,research:-1},risk:1,...extra});
const story=(id:string,title:string,text:string,left:Choice,right:Choice,character='turtle',role='风控官 · 玄武',probes:DimKey[]=['risk','discipline']):Card=>({id,kind:'story',title,text,left,right,character,role,probes});
export const tutorials:Card[]=[
  {...story('t1','第一条规矩','左右滑卡做决定。第一笔预算：留作现金，还是投入研究？',safe('留足现金'),bold('投入研究',{delta:{nav:-2,trust:1,risk:-1,research:3}}),'panda','研究员 · 小竹'),kind:'tutorial'},
  {...story('t2','没有永远正确的答案','顶部四项任一归零或满格，你就卸任。按住卡片，看哪几项会动。',safe('稳一点'),bold('试一试'),'crane','出资人 · 云鹤'),kind:'tutorial'},
  {...story('t3','让数据先说话','接下来是隐去日期的真实行情。左滑减仓，右滑加仓，上滑观望。',safe('明白，审慎判断'),bold('明白，敢做选择'),'cat','数据官 · 阿狸'),kind:'tutorial'},
];
const stories:Card[]=[
 story('s1','选择第一张地图','团队的第一笔研究预算，应该投向哪里？',safe('A 股与红利',{market:'a_share',style:'value'}),bold('期货与趋势',{market:'futures',style:'trend'}),'falcon','交易员 · 风隼',['market','style']),
 story('s2','客户催促','出资人希望你下个月跑赢市场。你决定如何回应？',safe('先约定回撤边界',{discipline:1}),bold('提高仓位追赶',{discipline:-1})),
 story('s3','便宜还是强势','两份研究摆在桌上。你愿意先花时间读哪一份？',safe('现金流与长期价值',{style:'value'}),bold('价格动量与突破',{style:'trend'}),'panda','研究员 · 小竹',['style','info']),
 story('s4','新的市场','下一季度，团队增加一条观察线。你更愿意了解哪一类？',safe('宽基 ETF',{market:'etf_fund',style:'value'}),bold('海外市场',{market:'hk_us',style:'event'}),'cat','数据官 · 阿狸',['market']),
 {...story('s5','消息满天飞','一个未经证实的消息正在群里传播，交易员等着你的决定。',safe('先查公开数据',{discipline:1}),bold('先交易再核实',{style:'event',discipline:-1}),'qilin','合规官 · 知白',['info','discipline']),report:true},
 story('s6','亏损后的会议','一周亏损后，你打算怎么调整下一笔交易？',safe('按原规则复盘',{discipline:1}),bold('放大仓位赚回来',{discipline:-1})),
 story('s7','耐心的成本','长期逻辑没有变化，但收益迟迟没有出现。',safe('复核逻辑与边界',{style:'value',discipline:1}),bold('切到最强热点',{style:'trend',discipline:-1}),'crane','出资人 · 云鹤',['style','discipline']),
 story('s8','研究预算','现在只能再做一件研究，你会选择？',safe('检验反例与风险',{style:'risk',delta:{research:4,risk:2,nav:-1}}),bold('寻找新动量',{style:'trend'}),'panda','研究员 · 小竹',['style','literacy']),
 story('s9','寻找机会','两个研究课题，哪一个更吸引你？',safe('跌深之后的修复',{style:'reversal'}),bold('政策变化的窗口',{style:'event'}),'falcon','交易员 · 风隼',['style']),
 story('s10','把经验写成规则','同事建议把你的判断变成可重复的策略，你会从哪里开始？',safe('先学基础再验证',{literacy:0}),bold('写规则做样本外检验',{style:'factor',literacy:2,delta:{research:4,nav:-1}}),'panda','研究员 · 小竹',['literacy','style']),
 story('s11','最后一道边界','好机会出现了，但会突破约定的风险上限。',safe('遵守既定上限',{discipline:1}),bold('本次例外',{discipline:-1})),
 story('s12','慢一点，远一点','出资人问：这家工作室最值得长期保留的是什么？',safe('稳定的风控流程',{style:'value',discipline:1}),bold('捕捉趋势的速度',{style:'trend'}),'crane','出资人 · 云鹤',['style','discipline']),
 story('s13','第二个观察账户','想再开一个研究账户，你会关注？',safe('指数与基金',{market:'etf_fund',style:'value'}),bold('商品期货',{market:'futures',style:'trend'}),'cat','数据官 · 阿狸',['market']),
 story('s14','接受不确定','两份报告意见相反，暂时没有新的证据。',safe('暂缓，保留判断',{discipline:1}),bold('按最强信号行动',{risk:2})),
 story('s15','模型的边界','模型突然失效，同事建议直接更换参数。',safe('排查数据和假设',{literacy:2,discipline:1}),bold('追随近期最优参数',{literacy:0,discipline:-1}),'panda','研究员 · 小竹',['literacy','discipline']),
 story('s16','一份漂亮的月报','同事想把最难看的一个月从图里去掉。你的决定是？',bold('先展示亮点',{discipline:-1,delta:{trust:3,research:-2}}),safe('保留完整区间',{discipline:1,delta:{trust:-1,research:3}}),'qilin','合规官 · 知白',['discipline','literacy']),
 story('s17','长线的回报','研究员找到一家现金流稳定的公司，但价格近期没有亮点。',safe('检验价值与估值',{style:'value'}),bold('先找价格的强者',{style:'trend'}),'panda','研究员 · 小竹',['style']),
 story('s18','另一种勇气','新策略和现有策略相关性很低，但你还不熟悉它。',bold('小仓试验',{risk:1,discipline:1,delta:{nav:-1,research:3,risk:-1}}),safe('继续验证假设',{risk:0,delta:{research:4,nav:-1}}),'turtle','风控官 · 玄武',['risk','discipline']),
 story('s19','留下研究笔记','交易员只想记录赚了钱的交易，你希望怎样做？',safe('盈利与亏损都记录',{discipline:1}),bold('先总结成功模式',{style:'trend',discipline:-1}),'cat','数据官 · 阿狸',['discipline','info']),
 story('s20','一场远方的变化','海外市场出现新的政策消息，你愿意为它配置研究时间吗？',safe('先守住已有观察线',{market:'a_share',style:'value'}),bold('建立海外事件清单',{market:'hk_us',style:'event'}),'falcon','交易员 · 风隼',['market','style']),
 story('s21','不用急着交易','今天信号很多，但彼此矛盾。出资人想看到你采取行动。',bold('按最强信号试一次',{risk:1}),safe('解释不交易的依据',{risk:-1,discipline:1}),'crane','出资人 · 云鹤',['risk','discipline']),
 story('s22','一次数据修订','数据官发现历史序列被修订了。已有结论还能直接沿用吗？',safe('重跑并记录版本',{discipline:1,literacy:2}),bold('趋势没变就先沿用',{discipline:-1,literacy:0}),'cat','数据官 · 阿狸',['discipline','literacy']),
 story('s23','谁承担等待','稳健策略跑输了一个快速上涨的月，出资人提出质疑。',safe('用既定风险目标沟通',{style:'value',discipline:1}),bold('增加趋势策略预算',{style:'trend'}),'crane','出资人 · 云鹤',['style','risk']),
 story('s24','把想法变成实验','同事提出一个新因子，你会要求什么？',bold('先测最近最热区间',{style:'trend',literacy:0}),safe('先写假设和检验标准',{style:'factor',literacy:2}),'panda','研究员 · 小竹',['literacy','style']),
 story('s25','波动突然放大','并没有新的公司消息，但日内价格波动明显增加。',safe('检查仓位与边界',{style:'risk',discipline:1}),bold('把波动看成机会',{style:'trend',risk:2}),'turtle','风控官 · 玄武',['risk','style']),
 story('s26','研究地图的空白','两条数据线还没有覆盖，你会先补哪一条？',safe('指数与资产配置',{market:'etf_fund',style:'value'}),bold('商品与跨期结构',{market:'futures',style:'trend'}),'cat','数据官 · 阿狸',['market','style']),
 story('s27','先问一个反例','你的核心判断得到大家赞同，下一步是什么？',bold('尽快把共识变成仓位',{risk:1}),safe('邀请同事寻找反例',{risk:0,discipline:1}),'qilin','合规官 · 知白',['risk','discipline']),
 story('s28','风格会变化吗','最近市场奖励了另一种研究风格，你会怎么办？',safe('重新检验原来的假设',{style:'value'}),bold('研究新趋势的持续性',{style:'trend'}),'panda','研究员 · 小竹',['style']),
 story('s29','要不要加一层杠杆','同一套策略加入杠杆，收益和回撤都将放大。',bold('先小幅试验',{risk:2,market:'futures'}),safe('先检验极端情境',{risk:-1,discipline:1}),'turtle','风控官 · 玄武',['risk','market']),
 story('s30','给下一任的话','任期将尽，你想把什么留给下一任？',safe('可复核的研究档案',{style:'value',discipline:1}),bold('一套趋势观察清单',{style:'trend'}),'crane','出资人 · 云鹤',['style','discipline']),
];
const question=(id:string,title:string,text:string,left:string,right:string,correct:'left'|'right',explanation:string):Card=>({id,kind:'knowledge',title,text,character:'panda',role:'研究员 · 小竹',probes:['literacy'],left:{text:left,delta:{research:correct==='left'?4:-2},correct:correct==='left'},right:{text:right,delta:{research:correct==='right'?4:-2},correct:correct==='right'},explanation});
export const knowledge:Card[]=[
 question('k1','未来不能偷看','回测在今天买入时，使用了明天的收盘价。这属于什么问题？','未来函数 / 前视偏差','样本太少','left','决策时不可获得的数据进入回测，就是前视偏差；结果会虚高。'),
 question('k2','回撤是什么','净值从 100 涨到 120，再跌到 90。最大回撤按哪一个计算？','从 100 跌到 90 的 10%','从 120 跌到 90 的 25%','right','最大回撤衡量从之前峰值到随后谷值的跌幅，这里为 90 / 120 - 1 = -25%。'),
 question('k3','漂亮的回测','你反复调整参数，直到历史收益很好看。下一步最应该做什么？','换一段没参与调参的数据检验','继续挑收益最高的参数','left','样本外检验有助于识别过拟合；历史拟合结果不是未来保证。'),
 question('k4','相关不等于因果','两个指标一起上涨，是否足以说明一个导致另一个？','足够，方向一致就行','不够，还需要检验与解释','right','相关性可能来自共同因素或偶然，需要经济逻辑和独立检验。'),
 question('k5','交易也有成本','策略回测盈利很薄，忽略了佣金和滑点。这个结果能直接照搬吗？','不能，需要计入交易成本','能，方向对了就可以','left','佣金、滑点和换手会侵蚀收益，实际交易约束需要进入评估。'),
 question('k6','分散的意义','买了十只同一行业、走势高度相似的股票，就充分分散了吗？','是，数量已经很多','未必，还要看相关性','right','资产数量不等于独立风险来源数量；同一行业可能共同下跌。'),
];
const allMarketCards:Card[]=pack.episodes.map(e=>({id:e.id,kind:'market',title:e.title,text:'接下来 20 个交易日，你怎么调仓？',character:'cat',role:'数据官 · 阿狸',episodeId:e.id,probes:['judgement','risk','style','info','discipline'],report:true,left:{text:'减仓',delta:{risk:1}},right:{text:'加仓',delta:{risk:-1}}}));
export const marketCards=allMarketCards.filter(c=>c.id.startsWith('e'));
export const cards:Card[]=[...tutorials,...stories,...knowledge,...marketCards];
export const cardById=Object.fromEntries(cards.map(c=>[c.id,c]));
export const styleNames:Record<string,string>={value:'价值',trend:'趋势',reversal:'反转',event:'事件',factor:'因子',risk:'风险研究',macro:'宏观',any:'通用'};
export function revisionCards(dim:DimKey,used:string[]=[]):Card[]{
 if(dim==='judgement')return allMarketCards.filter(c=>c.id.startsWith('r'));
 const templates=dim==='literacy'?knowledge.filter(c=>!used.includes(c.id)):dim==='info'?stories.filter(c=>['s3','s5','s8'].includes(c.id)):stories.filter(c=>c.probes.includes(dim));
 return (templates.length>=3?templates:stories).slice(0,3).map((c,i)=>({...c,id:`revision-${dim}-${i}`,title:`补充观察 · ${c.title}`,probes:[dim],report:dim==='info'||c.report}));
}
