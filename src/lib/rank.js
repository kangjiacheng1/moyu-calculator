// 摸鱼段位 · 中国神话水系篇：按摸鱼占工时比 ratio = fishMin / (workMin + fishMin)
export const RANKS = [
  {
    max: 0.03,
    name: '鲛人',
    emoji: '🧜‍♀️',
    color: 'var(--rank-1)',
    desc: '南海人鱼，织鲛绡、泣泪成珠。最温和的一位，靠手艺混饭吃，基本不打架。',
  },
  {
    max: 0.08,
    name: '海夜叉',
    emoji: '👹',
    color: 'var(--rank-2)',
    desc: '巡海夜叉，龙王座下基层公务员。长相凶、力气大，但经常是被哪吒、孙悟空随手收拾的杂兵。',
  },
  {
    max: 0.15,
    name: '化蛇',
    emoji: '🐍',
    color: 'var(--rank-3)',
    desc: '《山海经》记载，人面豺身有翼，声如婴儿啼哭，出现即引发洪水。单体不强，但自带"灾害预告"属性。',
  },
  {
    max: 0.25,
    name: '蛟',
    emoji: '🐉',
    color: 'var(--rank-4)',
    desc: '未成龙的龙，蛰伏江河，能兴风作浪、发大水。传说中蛟龙走水入海即化龙，属于"潜力股"。',
  },
  {
    max: 0.4,
    name: '无支祁',
    emoji: '🦍',
    color: 'var(--rank-5)',
    desc: '淮河水怪，猿形、力大无穷，大禹要请应龙助阵才将其镇压，铁链锁于龟山脚下。一说为孙悟空原型。',
  },
  {
    max: 0.55,
    name: '相柳',
    emoji: '🐲',
    color: 'var(--rank-6)',
    desc: '共工之臣，九头蛇身，食于九山，所过尽成毒泽。大禹斩之，其血腥不可居——需要"救世级"人物出手处理。',
  },
  {
    max: 0.7,
    name: '巨鳌',
    emoji: '🐢',
    color: 'var(--rank-7)',
    desc: '背负仙山的神龟。女娲"断鳌足以立四极"——拿它的腿当撑天柱，能当建材说明体型离谱，被斩也纯属倒霉。',
  },
  {
    max: 0.85,
    name: '禺彊',
    emoji: '🌬️',
    color: 'var(--rank-8)',
    desc: '《山海经》里的北海海神，人面鸟身、耳珥双蛇、足践双蛇，兼管北风与瘟疫。从"怪"晋升"神"编制，降维打击前面几位。',
  },
  {
    max: 0.95,
    name: '烛龙',
    emoji: '🕯️',
    color: 'var(--rank-9)',
    desc: '人面蛇身、身长千里，睁眼为昼、闭眼为夜、吹为冬、呼为夏。严格说它住钟山不在海里，但作为水系/龙系战力的天花板备选，放这儿压场子。',
  },
  {
    max: Infinity,
    name: '鲲鹏',
    emoji: '🐋',
    color: 'var(--rank-10)',
    desc: '北冥之鱼，"鲲之大，不知其几千里也"，化而为鹏、背若泰山、翼若垂天之云，水击三千里、抟扶摇而上九万里。前面九位加起来不够它一口吞的，近乎"道"的化身，排第一没有争议。',
  },
]

// 体系外传说：一整天零摸鱼的狠人
export const GRINDER = {
  name: '卷王',
  emoji: '💪',
  color: 'var(--rank-grinder)',
  desc: '一整天零摸鱼的狠人，段位体系外的传说，老板眼里的光。',
}

export const RANK_TBD = { name: '段位待定', emoji: '❓', color: 'var(--rank-tbd)', ratio: 0 }

export function getRank(workMin, fishMin) {
  const total = workMin + fishMin
  if (total <= 0) return RANK_TBD
  const ratio = fishMin / total
  if (ratio === 0) return { ...GRINDER, ratio }
  for (const r of RANKS) {
    if (ratio < r.max) return { ...r, ratio }
  }
  return { ...RANKS[RANKS.length - 1], ratio }
}
