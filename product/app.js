import './style.css';
import './mobile.css';
import { DEFAULT_PROFILE, calculate, SOURCES } from './model.js';
import { openHeart } from '../games/script.js';

const $ = (id) => document.getElementById(id);
const format = (value, digits = 0) => Number(value).toLocaleString('zh-CN', { maximumFractionDigits: digits });
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const currentYear = new Date().getFullYear();

let profile = { ...DEFAULT_PROFILE, mode: 'detail', daily: 15.8 };
let nickname = '';
try {
  const saved = JSON.parse(localStorage.getItem('afterglow-gala-v1') || localStorage.getItem('afterglow-v2') || 'null');
  if (saved?.profile) profile = { ...profile, ...saved.profile, mode: 'detail' };
  if (typeof saved?.nickname === 'string') nickname = saved.nickname.slice(0, 12);
} catch { /* The experience still works without storage. */ }

let result = calculate(profile);
if (!result.valid) {
  profile = { ...DEFAULT_PROFILE, mode: 'detail' };
  result = calculate(profile);
}

const trophy = `<svg viewBox="0 0 240 300" role="img" aria-label="金色奖杯">
  <defs><linearGradient id="cupGold" x1="0" x2="1"><stop stop-color="#7b4a16"/><stop offset=".22" stop-color="#ffd98b"/><stop offset=".5" stop-color="#b87520"/><stop offset=".76" stop-color="#fff0b0"/><stop offset="1" stop-color="#774310"/></linearGradient></defs>
  <path d="M62 38h116v56c0 55-25 92-58 92S62 149 62 94Z" fill="url(#cupGold)"/>
  <path d="M65 57H30v34c0 35 21 56 51 56M175 57h35v34c0 35-21 56-51 56" fill="none" stroke="url(#cupGold)" stroke-width="13"/>
  <path d="M111 180h18v45h-18zm-43 43h104l16 31H52z" fill="url(#cupGold)"/>
  <ellipse cx="120" cy="263" rx="82" ry="15" fill="#2c1605" opacity=".7"/>
  <path d="M89 73h62M89 91h62" stroke="#fff1b2" opacity=".35"/>
</svg>`;

const product = document.createElement('div');
product.id = 'product';
product.className = 'ceremony';
product.innerHTML = `
  <header class="gala-header">
    <button class="gala-brand" id="home-button" aria-label="返回邀请函"><i>余生</i><span>AFTERGLOW<br>ANNUAL HONORS</span></button>
    <div class="gala-progress" aria-label="体验进度"><span id="progress-label">贵宾入场</span><div><i id="progress-bar"></i></div><b id="progress-number">01 / 06</b></div>
    <div class="header-actions"><button id="sound-toggle" aria-pressed="false" aria-label="开启现场声音">♪ <span>现场声音</span></button><button id="data-button">数据说明</button></div>
  </header>

  <main>
    <section class="gala-act lobby" id="act-lobby" data-step="1">
      <div class="beam beam-a"></div><div class="beam beam-b"></div>
      <div class="gala-orbit" aria-hidden="true"><span>${currentYear}</span></div>
      <div class="lobby-copy">
        <p class="gala-kicker"><i></i> 烟草消费事业群 · 年度荣誉盛典</p>
        <h1><span>${currentYear} 年度</span><br>烟草贡献者<br><em>表彰大会</em></h1>
        <p class="lobby-lead">今晚，我们向每一位风雨无阻、长期稳定、<br>仍在坚持的消费者，致以最热烈的感谢。</p>
        <div class="lobby-actions"><button class="gold-button" id="enter-gala">接受贵宾邀请 <span>→</span></button><small>仅面向正在吸烟的成年人 · 约 3 分钟</small></div>
      </div>
      <aside class="invitation-card" aria-label="大会贵宾邀请函">
        <span class="card-shine"></span><div class="invite-top"><b>VIP</b><span>NO. ${String(Math.floor(Date.now() / 86400000)).slice(-5)}</span></div>
        <div class="invite-mark">余</div><p>ANNUAL<br>CONTRIBUTOR<br>HONORS</p><div class="invite-rule"></div><small>经系统初步确认<br>您符合本届大会参会资格</small>
      </aside>
      <div class="live-ticker" aria-hidden="true"><span>感谢每一次稳定消费</span><span>增长值得被看见</span><span>忠诚终将获得回报</span><span>感谢每一次稳定消费</span></div>
    </section>

    <section class="gala-act registration" id="act-registration" data-step="2" hidden>
      <div class="registration-stage">
        <div class="registration-copy"><p class="gala-kicker"><i></i> GUEST REGISTRATION</p><h2>请完善您的<br><em>获奖资料</em></h2><p>为了让掌声准确抵达每一位贡献者，系统需要三项数据。所有内容只保存在你的浏览器里。</p>
          <div class="privacy-seal"><b>本机保存</b><span>不上传 · 不建档 · 不写入分享链接</span></div>
        </div>
        <form id="profile-form" class="registration-form" novalidate>
          <label class="name-field"><span>颁奖称呼 <small>选填</small></span><input name="nickname" maxlength="12" autocomplete="nickname" placeholder="例如：王先生 / 匿名嘉宾" value="${nickname.replaceAll('&','&amp;').replaceAll('"','&quot;')}"></label>
          <div class="form-grid">
            <label><span>吸烟时长</span><div><input name="years" type="number" min="0.1" max="80" step="0.5" inputmode="decimal" value="${profile.years}" required><b>年</b></div></label>
            <label><span>平均每天</span><div><input name="daily" type="number" min="0.1" max="100" step="0.1" inputmode="decimal" value="${profile.daily}" required><b>支</b></div></label>
            <label><span>每月买烟</span><div><input name="monthly" type="number" min="0" max="100000" step="10" inputmode="decimal" value="${profile.monthly}" required><b>元</b></div></label>
          </div>
          <label class="adult-check"><input name="adult" type="checkbox" required><span>我已成年，并且目前仍在吸烟</span></label>
          <p id="form-error" role="alert"></p>
          <button class="gold-button" type="submit">提交参评资料 <span>→</span></button>
        </form>
      </div>
    </section>

    <section class="gala-act awards" id="act-awards" data-step="3" hidden>
      <div class="stage-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="stage-screen">
        <p class="gala-kicker centered"><i></i> HONORING EXCELLENCE IN CONSUMPTION <i></i></p>
        <div class="award-layout">
          <div class="trophy-wrap"><span class="trophy-halo"></span>${trophy}<div class="trophy-plaque" id="trophy-plaque">长期合作伙伴奖</div></div>
          <div class="award-copy"><span id="award-count">01 / 03</span><p id="award-prefix">首先颁发</p><h2 id="award-title">长期合作<br>伙伴奖</h2><div class="award-number"><strong id="award-value">${format(result.years, 1)}</strong><small id="award-unit">年</small></div><p id="award-caption">感谢你与本行业携手走过漫长岁月。</p><p class="winner-name">获奖嘉宾 · <b id="winner-name">${nickname || '匿名贵宾'}</b></p></div>
        </div>
        <button class="gold-button stage-next" id="next-award">请揭晓下一项大奖 <span>→</span></button>
      </div>
      <div id="confetti" aria-hidden="true"></div><div class="applause-sign" id="applause-sign">掌声</div>
    </section>

    <section class="gala-act report" id="act-report" data-step="4" hidden>
      <div class="report-shell">
        <div class="report-heading"><div><p class="gala-kicker"><i></i> GROUP PERFORMANCE REPORT</p><h2>感谢每一位贡献者，<br>共同成就了<em>漂亮数字</em></h2></div><span class="growth-badge">同比<br><b>再创新高</b></span></div>
        <div class="report-grid">
          <article class="personal-report"><span>您的个人投入 · 按当前水平回推</span><strong>¥ <b id="report-spent">${format(result.spent)}</b></strong><p>累计约 <b id="report-cigarettes">${format(result.cigarettes)}</b> 次点燃</p><small>历史消费与频率可能变化，此处是情景估算。</small></article>
          <article class="corporate-report"><span>2025 年行业工商税利</span><strong>16,570<small>亿元</small></strong><div class="growth-chart" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><svg viewBox="0 0 200 70"><path d="M2 62C32 58 38 45 65 48S101 34 125 36s40-25 73-31"></path></svg></div><p>新华社引国家烟草局发布数据 · 含利润</p></article>
          <article class="report-quote"><span>大会寄语</span><blockquote>每一次点燃，<br>都是对增长的<br><em>坚定信任。</em></blockquote></article>
        </div>
        <div class="report-disclaimer"><span>特别说明</span><p>行业工商税利不是你的个人纳税额。大会故意把个人与宏观数字并置，以讽刺只见增长、不见人的计算方式。</p><button class="dark-button" id="meet-heart">有请幕后贡献者登场 <span>→</span></button></div>
      </div>
    </section>

    <section class="gala-act interruption" id="act-interruption" data-step="5" hidden>
      <div class="signal-noise" aria-hidden="true"></div>
      <div class="interruption-copy"><p>LIVE FEED / SIGNAL INTERRUPTED</p><h2>感谢你的贡献。<br><em>至于代价，</em><br>本次大会不作统计。</h2><span>系统检测到一位未列入财务报告的幕后嘉宾。</span><button class="pale-button" id="open-heart">查看未列入报表的部分 <b>→</b></button></div>
      <div class="heart-pulse" aria-hidden="true"><i></i><i></i><i></i><span>72</span><small>BPM</small></div>
    </section>

    <section class="gala-act refusal" id="act-refusal" data-step="6" hidden>
      <div class="refusal-stage">
        <p class="gala-kicker centered"><i></i> FINAL HONOR OF THE EVENING <i></i></p>
        <h2>最后，请领取属于你的<br><em>终身贡献奖</em></h2>
        <div class="cigarette-award" id="cigarette-award" aria-label="一支正在燃烧的香烟奖杯"><div class="smoke"><i></i><i></i><i></i></div><span class="ember"></span><b></b><strong>余生集团 · 终身贡献</strong></div>
        <p class="refusal-line" id="refusal-line">领奖，意味着默认下一支仍会被点燃。</p>
        <button class="refuse-button" id="refuse-award"><span>我拒绝领奖</span><small>把下一支烟留在这里</small></button>
      </div>
    </section>

    <section class="gala-act finale" id="act-finale" data-step="6" hidden>
      <div class="finale-content">
        <div class="final-copy"><p class="gala-kicker"><i></i> AWARD DECLINED</p><h2>本次贡献，<br><em>可以缺席。</em></h2><p>你不需要今晚承诺一辈子。<br>下一支，可以不必现在点燃。</p><div class="final-actions"><button class="gold-button" id="share-poster">分享拒领奖声明 <span>↗</span></button><button class="line-button" id="save-poster">保存海报</button><button class="line-button" id="copy-link">复制邀请链接</button></div><small id="share-status" role="status">海报不会包含你的消费金额。</small></div>
        <div class="poster-preview" id="poster-preview" aria-label="拒领奖分享海报预览"><div class="poster-inner"><span>${currentYear} AFTERGLOW ANNUAL HONORS</span><div class="poster-stamp">拒绝<br>领奖</div><h3>我拒绝领取<br>年度烟草<br>稳定贡献奖</h3><p>有些增长，<br>到我这里为止。</p><footer><b>余生 · AFTERGLOW</b><i>你也收到邀请了吗？</i></footer></div></div>
      </div>
      <footer class="final-footer"><button id="restart">重新体验</button><span>公益交互作品 · 数据只存本机</span><button id="final-data">来源与创作说明</button></footer>
    </section>
  </main>

  <div id="gala-toast" role="status"></div>
  <dialog id="data-dialog"><button id="close-data" aria-label="关闭数据说明">×</button><p class="gala-kicker"><i></i> OPEN DATA / OPEN METHODS</p><h2>数字，需要来处。</h2><p>这是一部面向成年吸烟者的公益反讽作品。奖项与主持词是艺术创作，不代表任何机构。个人累计数字按当前消费水平回推，不预测疾病、寿命或个人税额。</p><div id="source-list"></div><h3>个人数字怎么算</h3><p>累计支数 = 日支数 × 365.25 × 烟龄；累计花费 = 月花费 × 12 × 烟龄。历史习惯和价格会变化，因此结果只是帮助理解规模的情景估算。</p><p class="dialog-note">没有账号、广告追踪或服务器个人数据。分享海报默认不包含花费、支数和烟龄。</p></dialog>
`;

document.body.prepend(product);
$('app').hidden = true;

const acts = ['lobby', 'registration', 'awards', 'report', 'interruption', 'refusal', 'finale'];
const progressNames = { lobby: '贵宾入场', registration: '参评登记', awards: '荣誉颁发', report: '集团报告', interruption: '特别嘉宾', refusal: '最后大奖', finale: '拒绝领奖' };
let currentAct = 'lobby';
let awardIndex = 0;
let audioEnabled = false;
let audioContext;

function showAct(name) {
  if (!acts.includes(name)) name = 'lobby';
  currentAct = name;
  acts.forEach((act) => $(`act-${act}`).hidden = act !== name);
  const rawStep = Number($(`act-${name}`).dataset.step);
  const step = Math.min(rawStep, 6);
  $('progress-label').textContent = progressNames[name];
  $('progress-number').textContent = `${String(step).padStart(2, '0')} / 06`;
  $('progress-bar').style.width = `${step / 6 * 100}%`;
  product.dataset.act = name;
  window.scrollTo(0, 0);
  history.replaceState(null, '', name === 'lobby' ? location.pathname : `#${name}`);
}

function persist() {
  try { localStorage.setItem('afterglow-gala-v1', JSON.stringify({ profile, nickname })); } catch { /* optional */ }
}

function notify(message) {
  $('gala-toast').textContent = message;
  $('gala-toast').classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $('gala-toast').classList.remove('show'), 2600);
}

function ensureAudio() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
}

function tone(frequency, duration = .22, delay = 0, gain = .055) {
  if (!audioEnabled) return;
  ensureAudio();
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = 'sine'; oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(0, audioContext.currentTime + delay);
  volume.gain.linearRampToValueAtTime(gain, audioContext.currentTime + delay + .02);
  volume.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + delay + duration);
  oscillator.connect(volume).connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + delay); oscillator.stop(audioContext.currentTime + delay + duration + .03);
}

function fanfare() { [392, 523, 659, 784].forEach((frequency, index) => tone(frequency, .48, index * .1, .045)); }

function applause() {
  if (!audioEnabled) return;
  ensureAudio();
  const length = audioContext.sampleRate * 1.25;
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, .45) * (Math.random() > .62 ? .8 : .13);
  const source = audioContext.createBufferSource(); const filter = audioContext.createBiquadFilter(); const gain = audioContext.createGain();
  filter.type = 'bandpass'; filter.frequency.value = 1350; filter.Q.value = .45; gain.gain.value = .14;
  source.buffer = buffer; source.connect(filter).connect(gain).connect(audioContext.destination); source.start();
}

$('sound-toggle').onclick = () => {
  audioEnabled = !audioEnabled;
  $('sound-toggle').setAttribute('aria-pressed', String(audioEnabled));
  $('sound-toggle').setAttribute('aria-label', audioEnabled ? '关闭现场声音' : '开启现场声音');
  if (audioEnabled) { ensureAudio(); tone(523); tone(659, .25, .1); }
};

$('home-button').onclick = () => showAct('lobby');
$('enter-gala').onclick = () => { showAct('registration'); tone(523); };

const form = $('profile-form');
form.onsubmit = (event) => {
  event.preventDefault();
  const draft = { ...profile, mode: 'detail', age: 100, years: Number(form.elements.years.value), daily: Number(form.elements.daily.value), monthly: Number(form.elements.monthly.value) };
  const next = calculate(draft);
  if (!form.elements.adult.checked) { $('form-error').textContent = '请确认你已成年并且目前仍在吸烟。'; return; }
  if (!next.valid || draft.years <= 0 || draft.daily <= 0) { $('form-error').textContent = next.errors?.[0] || '请填写有效的吸烟时长与每日支数。'; return; }
  $('form-error').textContent = '';
  nickname = form.elements.nickname.value.trim().slice(0, 12);
  profile = draft; result = next; persist(); updatePersonalData();
  awardIndex = 0; renderAward(); showAct('awards');
  setTimeout(() => { fanfare(); applause(); burstConfetti(); }, 180);
};

const awardData = () => [
  { title: '长期合作<br>伙伴奖', plaque: '长期合作伙伴奖', prefix: '首先颁发', value: format(result.years, 1), unit: '年', caption: `感谢你与本行业携手走过 ${format(result.years, 1)} 年。` },
  { title: '稳定增长<br>贡献奖', plaque: '稳定增长贡献奖', prefix: '接下来颁发', value: format(result.daily * 365.25), unit: '次 / 年', caption: `按当前频率，你每年预计完成约 ${format(result.daily * 365.25)} 次点燃。` },
  { title: '个人投入<br>成就奖', plaque: '个人投入成就奖', prefix: '压轴大奖', value: `¥${format(result.spent)}`, unit: '累计估算', caption: '这笔投入属于你，增长属于报表。' },
];

function updatePersonalData() {
  $('winner-name').textContent = nickname || '匿名贵宾';
  $('report-spent').textContent = format(result.spent);
  $('report-cigarettes').textContent = format(result.cigarettes);
}

function renderAward() {
  const award = awardData()[awardIndex];
  $('award-count').textContent = `${String(awardIndex + 1).padStart(2, '0')} / 03`;
  $('award-prefix').textContent = award.prefix; $('award-title').innerHTML = award.title;
  $('award-value').textContent = award.value; $('award-unit').textContent = award.unit;
  $('award-caption').textContent = award.caption; $('trophy-plaque').textContent = award.plaque;
  $('next-award').innerHTML = awardIndex === 2 ? '查看集团年度成绩 <span>→</span>' : '请揭晓下一项大奖 <span>→</span>';
}

function burstConfetti() {
  if (reducedMotion) return;
  const colors = ['#f9d779', '#fff1bd', '#b57922', '#9d1717', '#f5b945'];
  $('confetti').replaceChildren(...Array.from({ length: 56 }, (_, index) => {
    const piece = document.createElement('i');
    piece.style.cssText = `--x:${Math.random() * 100}vw;--r:${Math.random() * 720 - 360}deg;--d:${1.5 + Math.random() * 2}s;--delay:${Math.random() * .35}s;--c:${colors[index % colors.length]}`;
    return piece;
  }));
  $('applause-sign').classList.remove('pop'); requestAnimationFrame(() => $('applause-sign').classList.add('pop'));
}

$('next-award').onclick = () => {
  if (awardIndex < 2) { awardIndex++; renderAward(); fanfare(); applause(); burstConfetti(); }
  else { showAct('report'); tone(392, .5); }
};

$('meet-heart').onclick = () => { showAct('interruption'); tone(110, .9, 0, .08); };

const heartBack = document.createElement('button');
heartBack.id = 'exit-heart'; heartBack.className = 'gala-heart-back'; heartBack.textContent = '返回大会现场 →'; heartBack.hidden = true;
document.body.append(heartBack);

$('open-heart').onclick = () => {
  product.hidden = true; $('app').hidden = false; heartBack.hidden = false;
  history.replaceState(null, '', '#heart'); openHeart(result.years);
};

heartBack.onclick = () => {
  $('app').hidden = true; product.hidden = false; heartBack.hidden = true;
  showAct('refusal'); setTimeout(() => tone(196, .8), 100);
};

$('refuse-award').onclick = () => {
  $('refuse-award').disabled = true;
  $('cigarette-award').classList.add('extinguished');
  $('refusal-line').textContent = '申请已提交。大会正在撤回你的终身贡献奖……';
  tone(98, .55, 0, .08);
  setTimeout(() => { showAct('finale'); $('refuse-award').disabled = false; }, reducedMotion ? 150 : 1450);
};

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath(); context.roundRect(x, y, width, height, radius); context.fill();
}

async function createPoster() {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 1080, 1440); bg.addColorStop(0, '#210d08'); bg.addColorStop(.55, '#080605'); bg.addColorStop(1, '#2a1508');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1440);
  const glow = ctx.createRadialGradient(790, 270, 20, 790, 270, 650); glow.addColorStop(0, '#d19b3b44'); glow.addColorStop(1, '#00000000'); ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1000);
  ctx.strokeStyle = '#c9933c'; ctx.lineWidth = 2; ctx.strokeRect(55, 55, 970, 1330); ctx.strokeRect(72, 72, 936, 1296);
  ctx.fillStyle = '#d7aa59'; ctx.font = '28px Arial, sans-serif'; ctx.fillText(`${currentYear} · AFTERGLOW ANNUAL HONORS`, 110, 145);
  ctx.font = '20px Arial, sans-serif'; ctx.fillStyle = '#917955'; ctx.fillText('AWARD DECLINED / 拒领奖声明', 110, 195);
  ctx.fillStyle = '#f8e9c5'; ctx.font = '700 92px "Microsoft YaHei", sans-serif';
  ['我拒绝领取', '年度烟草', '稳定贡献奖'].forEach((line, index) => ctx.fillText(line, 105, 390 + index * 126));
  ctx.fillStyle = '#dcb665'; ctx.font = '52px "Microsoft YaHei", sans-serif'; ctx.fillText('有些增长，', 110, 875); ctx.fillText('到我这里为止。', 110, 950);
  ctx.save(); ctx.translate(810, 820); ctx.rotate(-.13); ctx.strokeStyle = '#ad1d17'; ctx.lineWidth = 12; ctx.fillStyle = '#ad1d1722'; roundedRect(ctx, -145, -105, 290, 210, 18); ctx.strokeRect(-145, -105, 290, 210); ctx.fillStyle = '#d13a30'; ctx.textAlign = 'center'; ctx.font = '800 66px "Microsoft YaHei", sans-serif'; ctx.fillText('拒绝', 0, -15); ctx.fillText('领奖', 0, 72); ctx.restore();
  ctx.fillStyle = '#ead3a1'; ctx.font = '30px "Microsoft YaHei", sans-serif'; ctx.fillText(nickname ? `${nickname} · 本次贡献，可以缺席。` : '本次贡献，可以缺席。', 110, 1130);
  ctx.strokeStyle = '#745d38'; ctx.beginPath(); ctx.moveTo(110, 1195); ctx.lineTo(970, 1195); ctx.stroke();
  ctx.fillStyle = '#f0dba8'; ctx.font = '700 30px "Microsoft YaHei", sans-serif'; ctx.fillText('余生 · AFTERGLOW', 110, 1270);
  ctx.font = '24px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#9c855e'; ctx.fillText('你也收到邀请了吗？', 110, 1320);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function saveBlob(blob) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = '余生-拒领奖声明.png'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

$('save-poster').onclick = async () => { const blob = await createPoster(); await saveBlob(blob); notify('拒领奖海报已保存'); };
$('share-poster').onclick = async () => {
  const blob = await createPoster();
  const file = new File([blob], '余生-拒领奖声明.png', { type: 'image/png' });
  const shareData = { title: '余生 · 年度烟草贡献者表彰大会', text: '我拒绝领取年度烟草稳定贡献奖。有些增长，到我这里为止。你也收到邀请了吗？', url: location.origin + location.pathname };
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ ...shareData, files: [file] });
    else if (navigator.share) await navigator.share(shareData);
    else { await saveBlob(blob); await navigator.clipboard?.writeText(shareData.url); notify('海报已保存，邀请链接已复制'); }
  } catch (error) { if (error.name !== 'AbortError') { await saveBlob(blob); notify('海报已保存，可以直接发送给朋友'); } }
};

$('copy-link').onclick = async () => {
  const link = location.origin + location.pathname;
  try { await navigator.clipboard.writeText(link); notify('邀请链接已复制'); }
  catch { notify('请复制浏览器地址，邀请朋友入场'); }
};

$('restart').onclick = () => { awardIndex = 0; showAct('lobby'); };

function showData() { $('data-dialog').showModal(); }
$('data-button').onclick = showData; $('final-data').onclick = showData; $('close-data').onclick = () => $('data-dialog').close();
$('source-list').innerHTML = SOURCES.slice(0, 5).map((source) => `<article><a href="${source.url}" target="_blank" rel="noopener">${source.title} ↗</a><small>${source.year}</small><p>${source.note}</p></article>`).join('');

updatePersonalData();
showAct('lobby');
window.__product = { get profile() { return profile; }, get result() { return result; }, showAct, createPoster };
