export const SOURCES = [
 {id:'global',title:'全球每年超过 700 万人死于烟草',year:'WHO · 2026-06-26',url:'https://www.who.int/news-room/fact-sheets/detail/tobacco',note:'含二手烟暴露；是年度估计，不是实时死亡监测。'},
 {id:'china',title:'中国每年超过 100 万人因烟草相关疾病死亡',year:'WHO 中国专题 · 页面未标更新日期',url:'https://www.who.int/china/health-topics/tobacco',note:'保留该来源口径，不与其他模型估算混用；不宣称为 2026 年统计。'},
 {id:'survey',title:'23.2% 成人吸烟率 · 平均每日 15.8 支',year:'中国疾控周报 · 2024 年调查 / 2025 年发表',url:'https://weekly.chinacdc.cn/en/article/doi/10.46234/ccdcw2025.124',note:'吸烟率针对中国 15 岁及以上人群；15.8 支是现在吸烟者平均数，不是个人建议。'},
 {id:'fiscal',title:'工商税利 16,570 亿元 · 财政总额 15,800 亿元',year:'新华社引国家烟草局 · 2025 年数据 / 2026-01-22 发布',url:'https://www1.xinhuanet.com/20260122/e01afe19964049e8b0da1df3d0956df2/c.html',note:'工商税利含利润，财政总额也不等于单独税收。不能按此推算某位烟民的实际纳税额。'},
 {id:'recovery',title:'停止吸烟后，身体会发生什么',year:'WHO · 戒烟获益时间线',url:'https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation',note:'群体研究的一般方向，个人恢复速度不同。'},
 {id:'nrt',title:'尼古丁替代治疗：贴片、口香糖等',year:'NHS · 戒烟支持',url:'https://www.nhs.uk/better-health/quit-smoking/ready-to-quit-smoking/quit-with-nicotine-replacement-therapies-nrt/',note:'了解后咨询医师或药师；不是个人用药处方，也没有商业佣金。'},
];
export const DEFAULT_PROFILE={mode:'quick',age:35,years:10,daily:15.8,monthly:600,share:50};
export function calculate(p){
 const errors=[];
 for(const key of ['years','monthly','share',...(p.mode==='detail'?['age','daily']:[])])if(!Number.isFinite(Number(p[key])))errors.push('请填写有效数字');
 const age=Number(p.age),years=Number(p.years),monthly=Number(p.monthly),daily=p.mode==='quick'?15.8:Number(p.daily),share=Number(p.share);
 if(years<0||years>100)errors.push('烟龄应在 0–100 年之间');
 if(p.mode==='detail'&&(age<18||age>100||years>age))errors.push('年龄应为 18–100 岁，烟龄不能超过年龄');
 if(monthly<0||monthly>100000)errors.push('月花费应在 0–100,000 元之间');
 if(daily<0||daily>100)errors.push('每日支数应在 0–100 支之间');
 if(share<0||share>100)errors.push('假设税费比例应在 0–100% 之间');
 if(errors.length)return {valid:false,errors:[...new Set(errors)]};
 const cigarettes=years*365.25*daily,spent=years*12*monthly,packYears=years*daily/20;
 return {valid:true,years,daily,monthly,cigarettes,spent,packYears,assumedTax:spent*share/100,annual:monthly*12,tenYears:monthly*120,visualLoad:100*(1-Math.exp(-packYears/22)),perCigarette:daily>0?monthly/(365.25/12*daily):0};
}
export function quitStats(plan,p,now=Date.now()){
 const start=Date.parse(plan);if(!Number.isFinite(start)||start>now)return {active:false};
 const elapsed=now-start,days=elapsed/86400000;
 return {active:true,elapsed,days,saved:days*p.monthly*12/365.25,avoided:days*p.daily};
}
