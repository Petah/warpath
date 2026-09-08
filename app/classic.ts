import DefaultScene from './scenes/default';
import Planet from './planet';

export interface GameOptions { name: string; empire: number; ship: number; enemies: number; path: string; }

export default class Classic {
    static empires = ['Human', 'Tauran', 'Ditt', 'Klepton', 'Gnarf', 'Gryll', 'Ynik'];
    static options(): GameOptions {
        let saved: any = {};
        try { saved = JSON.parse(localStorage.getItem('warpath-options') || '{}') || {}; } catch (_) {}
        const bounded = (n, max, fallback) => typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n >= 0 && n <= max ? n : fallback;
        return { name: String(saved.name || 'Captain').slice(0, 24), empire: bounded(saved.empire, 6, 4),
            ship: bounded(saved.ship, 3, 0), enemies: Math.max(1, bounded(saved.enemies, 3, 3)), path: saved.path === 'red' ? 'red' : 'green' };
    }
    public visited: { [index: number]: boolean } = {};
    public explored: { [sector: string]: boolean } = {};
    public investment = 10000;
    public sectorView = false;
    private paused: { [reason: string]: boolean } = {};
    private overlay: HTMLElement;
    private lastSector = '';
    private messages: string[] = [];
    private watched = 0;

    constructor(public scene: DefaultScene) {
        this.layout();
        this.overlay = document.createElement('div');
        this.overlay.className = 'classic-overlay';
        this.overlay.style.display = 'none';
        document.body.appendChild(this.overlay);
        window.addEventListener('resize', () => this.fit());
        this.fit();
        document.addEventListener('keydown', event => {
            const target = event.target as HTMLElement;
            if (/INPUT|SELECT|TEXTAREA/.test(target.tagName) && event.key !== 'Escape') return;
            if (event.key === 'Escape') {
                if (this.overlay.style.display !== 'none') this.close();
                else if (document.getElementById('modal-wrapper').style.display !== 'none') this.scene.ui.hideModals();
                else this.togglePause();
            }
            if (event.key === 'F1' || event.key === '?') { event.preventDefault(); this.help(); }
            if (this.overlay.style.display !== 'none' || document.getElementById('modal-wrapper').style.display !== 'none') return;
            if (event.key.toLowerCase() === 'p') this.togglePause();
            if (this.paused.manual) return;
            if (event.key === ' ' || event.key === '0') { event.preventDefault(); this.scene.playerShip.stop(); }
            if (event.key === '+' || event.key === '=' || event.key === 'ArrowUp') { event.preventDefault(); this.scene.playerShip.adjustSpeed(1); }
            if (event.key === '-' || event.key === 'ArrowDown') { event.preventDefault(); this.scene.playerShip.adjustSpeed(-1); }
            if (event.key.toLowerCase() === 'r') this.scene.playerShip.reverse();
            if (event.key.toLowerCase() === 'g') this.guide();
            const weaponIds = ['item-laser', 'item-torpedo', 'item-mine', 'item-hot-torpedo', 'item-nuke', 'item-bio'];
            if (/^[1-6]$/.test(event.key)) document.getElementById(weaponIds[Number(event.key) - 1]).click();
        });
        document.addEventListener('visibilitychange', () => this.pause('hidden', document.hidden));
    }

    private fit() {
        const scale = Math.min(window.innerWidth / 960, window.innerHeight / 720, 1.8);
        (document.querySelector('.main') as HTMLElement).style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
    }
    private button(id: string, icon: string, label: string, action: () => void) {
        const button = document.createElement('button');
        button.id = id; button.title = label; button.setAttribute('aria-label', label);
        button.innerHTML = '<img src="assets/original/' + icon + '.png" alt="">';
        button.onclick = action;
        return button;
    }
    private layout() {
        const right = document.querySelector('.right');
        const rows = right.querySelectorAll('.item-buttons');
        rows[0].classList.add('planet-actions'); rows[1].classList.add('weapons'); rows[2].classList.add('equipment');
        const toolbar = document.createElement('div'); toolbar.className = 'classic-toolbar';
        toolbar.appendChild(this.button('scan-planet', 'scan', 'Scan current planet', () => this.scan()));
        toolbar.appendChild(this.button('show-radio', 'radio', 'Radio log', () => this.toggleRadio()));
        toolbar.appendChild(this.button('show-guide', 'guide', 'Planetary guide (G)', () => this.guide()));
        toolbar.appendChild(this.button('show-report', 'report', 'Empire report', () => this.report()));
        toolbar.appendChild(this.button('show-equipment', 'equipment', 'Ship inventory', () => this.inventory()));
        right.appendChild(toolbar);
        const nav = document.createElement('div'); nav.className = 'navigation';
        nav.appendChild(this.button('speed-up', 'speed-up', 'Increase speed (+ / Up)', () => this.scene.playerShip.adjustSpeed(1)));
        nav.appendChild(this.button('speed-down', 'speed-down', 'Decrease speed (- / Down)', () => this.scene.playerShip.adjustSpeed(-1)));
        nav.appendChild(this.button('stop-ship', 'stop', 'Full stop (Space)', () => this.scene.playerShip.stop()));
        nav.appendChild(this.button('reverse-ship', 'reverse', 'Reverse course (R)', () => this.scene.playerShip.reverse()));
        nav.appendChild(this.button('sector-view', 'sector-view', 'Toggle sector / ship camera', () => { this.sectorView = !this.sectorView; this.updateCamera(); }));
        nav.appendChild(this.button('follow-ship', 'follow', 'Return view to your ship', () => { this.watched = 0; this.sectorView = false; this.updateCamera(); }));
        right.appendChild(nav);
        Array.prototype.slice.call(document.querySelectorAll('.resources-text')).forEach((el, i) => { el.title = el.textContent; el.textContent = ['ILL','DEV','ORE'][i]; });
        const speed = document.createElement('div'); speed.id = 'speed-readout';
        document.querySelector('.bottom').appendChild(speed);
        const menu = document.querySelector('.menu'); menu.innerHTML = '';
        const menus = {
            File: [['New solo game', () => this.registration()], ['Pause / resume (P)', () => this.togglePause()], ['Fullscreen', () => this.fullscreen()]],
            Actions: [['Mine', () => document.getElementById('mine').click()], ['Colonise', () => document.getElementById('populate').click()], ['Invest', () => document.getElementById('open-invest').click()], ['Trade', () => document.getElementById('open-buy').click()], ['Full stop', () => this.scene.playerShip.stop()]],
            Windows: [['Planetary guide', () => this.guide()], ['Radio', () => this.toggleRadio()], ['Empire report', () => this.report()], ['Ship inventory', () => this.inventory()]],
            Tutorial: [['Flight & first colony', () => this.help()]],
            Help: [['How to play (F1)', () => this.help()], ['Sound on / off', () => this.mute()]],
        };
        Object.keys(menus).forEach(label => {
            const details = document.createElement('details') as HTMLDetailsElement;
            const summary = document.createElement('summary'); summary.textContent = label; details.appendChild(summary);
            const list = document.createElement('div'); list.className = 'menu-popup';
            menus[label].forEach(entry => { const b = document.createElement('button'); b.textContent = entry[0]; b.onclick = () => { details.open = false; entry[1](); }; list.appendChild(b); });
            details.appendChild(list); menu.appendChild(details);
        });
        document.addEventListener('click', event => { Array.prototype.slice.call(menu.querySelectorAll('details')).forEach((d: HTMLDetailsElement) => { if (!d.contains(event.target as Node)) d.open = false; }); });
        document.querySelector('.footer').innerHTML = '<span id="status-text">Ready for departure.</span><button id="pause-game">Pause</button><button id="mute-game">Sound on</button><span id="path-status">SOLO</span>';
        document.getElementById('pause-game').onclick = () => this.togglePause();
        document.getElementById('mute-game').onclick = () => this.mute();
        const radio = document.createElement('div'); radio.id = 'radio-window'; radio.hidden = true;
        radio.innerHTML = '<div class="window-title">Radio <button id="close-radio" aria-label="Close radio">×</button></div><div id="radio-messages" role="log" aria-live="polite"></div>';
        document.querySelector('.main').appendChild(radio);
        document.getElementById('close-radio').onclick = () => this.toggleRadio();
        Array.prototype.slice.call(document.querySelectorAll('.item-buttons button')).forEach((b: HTMLButtonElement) => { b.title = b.textContent.trim().replace(/\s+/g, ' '); b.setAttribute('aria-label', b.title); Array.prototype.slice.call(b.childNodes).forEach(n => { if (n.nodeType === 3 || n.nodeName === 'BR') b.removeChild(n); }); });
        const dial = document.createElement('div'); dial.id = 'year-dial'; document.getElementById('time-seg').appendChild(dial);
        const input = document.createElement('input'); input.id = 'investment-amount'; input.type = 'number'; input.min = '100'; input.max = '1000000'; input.step = '100'; input.value = '10000'; input.setAttribute('aria-label', 'Amount to invest');
        const value = document.querySelector('#modal-invest .ship-money').parentElement.parentElement.nextElementSibling.querySelector('span');
        value.parentNode.replaceChild(input, value);
        input.onchange = () => { this.investment = Math.max(100, Math.min(1000000, Math.floor(Number(input.value) || 10000))); input.value = String(this.investment); };
        document.querySelector('#modal-invest .cancel-modal').textContent = 'DONE';
        // Match the original broker's two rows: mining/spaceport/industry, then agriculture/defense/education.
        const slots = document.querySelectorAll('#modal-invest .invest-button');
        const order = ['invest-mining-button','invest-spaceport-button','invest-industry-button','invest-agriculture-button','invest-shield-button','invest-education-button'];
        const buttons = order.map(id => document.getElementById(id));
        const parents: HTMLElement[] = []; Array.prototype.slice.call(slots).forEach(s => parents.push(s.parentElement));
        buttons.forEach((b, i) => parents[i].appendChild(b));
    }
    public ready() {
        const opts = Classic.options();
        const teams = document.querySelectorAll('.team');
        Array.prototype.slice.call(teams).forEach((team: HTMLElement, i) => {
            if (i > opts.enemies) { team.style.visibility = 'hidden'; return; }
            const empire = i ? (opts.empire + i) % 7 : opts.empire;
            team.querySelector('img').setAttribute('src', 'assets/original/empire-' + empire + '.png');
            const name = team.querySelector('.team-name') as HTMLElement;
            name.textContent = Classic.empires[empire]; name.style.color = i ? (opts.path === 'green' ? '#ff4040' : '#00ee00') : opts.path;
            const captain = document.createElement('span'); captain.className = 'captain'; captain.textContent = i ? ['','Bzave','Chris','Reno'][i] : opts.name; team.appendChild(captain);
            team.tabIndex = 0; team.title = 'Watch ' + captain.textContent;
            team.onclick = () => { this.watched = i; this.updateCamera(); this.log('View switched to ' + captain.textContent + '. Controls still command your ship.'); };
            team.onkeydown = e => { if (e.key === 'Enter') team.click(); };
        });
        document.querySelector('.header p').textContent = 'Warpath — ' + opts.name + ' [' + opts.path.toUpperCase() + ' PATH]';
        document.getElementById('score-us').style.color = opts.path === 'green' ? '#00ee00' : '#ff3030';
        document.getElementById('score-them').style.color = opts.path === 'green' ? '#ff3030' : '#00ee00';
        document.getElementById('path-status').textContent = opts.path.toUpperCase() + ' · SOLO';
        this.visit(this.scene.playerShip.stoppedOnPlanet);
        this.scene.ui.updateUi();
        this.scene.cameras.main.centerOn(this.scene.playerShip.x, this.scene.playerShip.y);
        this.log('Command > Mine an empty planet, sell the ore, and invest in your colonies.');
        let start = false;
        try { start = sessionStorage.getItem('warpath-start') === 'yes'; sessionStorage.removeItem('warpath-start'); this.scene.sound.mute = localStorage.getItem('warpath-muted') === 'yes'; } catch (_) {}
        this.refreshMute();
        if (!start) this.registration();
        this.update();
    }
    public pause(reason: string, on: boolean) {
        this.paused[reason] = on;
        const pause = Object.keys(this.paused).some(k => this.paused[k]);
        this.scene.input.keyboard.enabled = !pause;
        if (pause) this.scene.scene.pause(); else this.scene.scene.resume();
        document.getElementById('pause-game').textContent = this.paused.manual ? 'Resume' : 'Pause';
    }
    private togglePause() { this.pause('manual', !this.paused.manual); this.log(this.paused.manual ? 'Simulation paused.' : 'Simulation resumed.'); }
    private mute() { this.scene.sound.mute = !this.scene.sound.mute; try { localStorage.setItem('warpath-muted', this.scene.sound.mute ? 'yes' : 'no'); } catch (_) {} this.refreshMute(); }
    private refreshMute() { document.getElementById('mute-game').textContent = this.scene.sound.mute ? 'Sound off' : 'Sound on'; }
    private fullscreen() { const root: any = document.documentElement; if (!document.fullscreenElement && root.requestFullscreen) root.requestFullscreen().catch(() => this.log('Fullscreen is unavailable in this browser.')); else if (document.exitFullscreen) document.exitFullscreen(); }
    public log(text: string) {
        this.messages.push(text); if (this.messages.length > 60) this.messages.shift();
        document.getElementById('status-text').textContent = text;
        const log = document.getElementById('radio-messages'); log.textContent = this.messages.join('\n'); log.scrollTop = log.scrollHeight;
    }
    private toggleRadio() { const el = document.getElementById('radio-window'); el.hidden = !el.hidden; }
    private dialog(title: string, body: string) {
        this.scene.ui.hideModals();
        this.overlay.innerHTML = '<section class="classic-dialog" role="dialog" aria-modal="true" aria-label="' + title + '"><div class="window-title">' + title + '<button id="classic-close" aria-label="Close">×</button></div><div class="classic-dialog-body">' + body + '</div></section>';
        this.overlay.style.display = 'flex'; this.pause('dialog', true);
        document.getElementById('classic-close').onclick = () => this.close();
        (this.overlay.querySelector('input, button') as HTMLElement).focus();
    }
    public close() { this.overlay.style.display = 'none'; this.pause('dialog', false); }
    private registration() {
        const opts = Classic.options();
        this.dialog('SOLO GAME REGISTRATION', '<form id="register-game"><fieldset><legend>Please register your player:</legend><div class="registration-fields"><label>Name<input id="captain-name" maxlength="24" required></label><label>Path<select id="captain-path"><option value="green">Green</option><option value="red">Red</option></select><img id="path-preview" alt="Path flag"></label><label>Empire<select id="captain-empire">' + Classic.empires.map((e,i) => '<option value="'+i+'">'+e+'</option>').join('') + '</select><img id="empire-preview" alt="Empire portrait"></label><label>Ship<select id="captain-ship"><option value="0">Scout</option><option value="1">Cruiser</option><option value="2">Interceptor</option><option value="3">Saucer</option></select><img id="ship-preview" alt="Ship design"></label></div></fieldset><fieldset><legend>Choose your opponents:</legend><label># Enemies <select id="enemy-count"><option value="1">ONE</option><option value="2">TWO</option><option value="3">THREE</option></select></label></fieldset><p class="hint">Explore · Mine · Trade · Colonise · Invest</p><div class="dialog-actions"><button type="button" id="setup-help">HELP</button><button type="button" id="setup-cancel">CANCEL</button><button type="submit">PLAY GAME</button></div></form>');
        const value = (id: string) => document.getElementById(id) as HTMLInputElement;
        value('captain-name').value = opts.name; value('captain-path').value = opts.path; value('captain-empire').value = String(opts.empire); value('captain-ship').value = String(opts.ship); value('enemy-count').value = String(opts.enemies);
        const preview = () => { (document.getElementById('empire-preview') as HTMLImageElement).src = 'assets/original/empire-' + value('captain-empire').value + '.png'; (document.getElementById('path-preview') as HTMLImageElement).src = 'assets/original/flag-' + value('captain-path').value + '.png'; (document.getElementById('ship-preview') as HTMLImageElement).src = 'assets/original/' + ['ship','ship2','ship3','ship4'][Number(value('captain-ship').value)] + '.png'; };
        ['captain-empire','captain-path','captain-ship'].forEach(id => value(id).onchange = preview); preview();
        document.getElementById('setup-help').onclick = () => this.help(); document.getElementById('setup-cancel').onclick = () => this.close();
        document.getElementById('register-game').onsubmit = event => {
            event.preventDefault();
            const options = { name: value('captain-name').value.trim() || 'Captain', path: value('captain-path').value, empire: Number(value('captain-empire').value), ship: Number(value('captain-ship').value), enemies: Number(value('enemy-count').value) };
            try { localStorage.setItem('warpath-options', JSON.stringify(options)); sessionStorage.setItem('warpath-start', 'yes'); location.reload(); } catch (_) { this.log('Browser storage is unavailable. Starting with the current settings.'); this.close(); }
        };
    }
    public visit(planet: Planet) {
        if (!planet) return;
        this.visited[this.scene.level.planets.indexOf(planet)] = true;
        this.log('Orbit > ' + planet.name + '. ' + (planet.canMine ? 'Uninhabited; ore available for mining.' : 'Population ' + Math.round(planet.getTotalPopulationConsumed()).toLocaleString() + '.'));
        this.scene.ui.drawMiniMap();
    }
    public isKnown(planet: Planet) { return !!this.visited[this.scene.level.planets.indexOf(planet)]; }
    public resetView() { this.watched = 0; this.updateCamera(); }
    public canSeeEnemy(enemy) {
        return this.scene.level.planets.some(p => this.isKnown(p) && p.getAllegiance(this.scene.playerTeam) > 66 && Math.floor(p.x / 600) === Math.floor(enemy.x / 600) && Math.floor(p.y / 600) === Math.floor(enemy.y / 600));
    }
    public updateCamera() {
        const ship = this.watched ? this.scene.enemyShips[this.watched - 1] : this.scene.playerShip;
        if (!ship) return;
        const camera = this.scene.cameras.main;
        if (this.sectorView) { camera.stopFollow(); camera.setScroll(Math.floor(ship.x / 600) * 600, Math.floor(ship.y / 600) * 600); }
        else camera.startFollow(ship.image, true, 1, 1);
        document.getElementById('sector-view').classList.toggle('active', this.sectorView);
    }
    public update() {
        const ship = this.scene.playerShip;
        document.getElementById('item-cloak').classList.toggle('active', ship.cloaked);
        document.getElementById('item-sun').classList.toggle('active', ship.disrupting);
        const sector = Math.floor(ship.x / 600) + ',' + Math.floor(ship.y / 600);
        this.explored[sector] = true;
        if (this.lastSector !== sector) { this.lastSector = sector; this.scene.ui.drawMiniMap(); }
        if (this.sectorView) this.updateCamera();
        document.getElementById('year-dial').style.background = 'conic-gradient(#3faaaa 0 ' + ((this.scene.gameTime % 10) * 10) + '%, transparent 0)';
        document.getElementById('speed-readout').textContent = 'SPEED ' + Math.round(ship.speed / 20) + '  ·  FREE ' + Math.floor(ship.maxEnergy) + '  ·  SHIPS ' + ship.lives;
        Array.prototype.slice.call(document.querySelectorAll('.minimap-planet')).forEach((el: HTMLElement, i) => {
            const planet = this.scene.level.planets[i];
            el.style.display = this.explored[Math.floor(planet.x/600)+','+Math.floor(planet.y/600)] ? '' : 'none';
            el.style.backgroundColor = this.isKnown(planet) ? planet.getPlanetColor(ship.team) : '#999';
            el.classList.toggle('distress', this.isKnown(planet) && planet.getAllegiance(ship.team) > 66 && planet.resources < 5);
        });
        this.scene.enemyShips.forEach((enemy, i) => {
            const visible = this.canSeeEnemy(enemy);
            document.getElementById('minimap-ship-' + (i + 2)).style.display = visible ? '' : 'none';
        });
        const map = document.getElementById('minimap');
        for (let i = 0; i < 25; i++) {
            let tile = document.getElementById('sector-'+i);
            if (!tile) { tile = document.createElement('div'); tile.id='sector-'+i; tile.className='map-sector'; tile.style.left=(i%5*20)+'%'; tile.style.top=(Math.floor(i/5)*20)+'%'; map.appendChild(tile); }
            const key = i%5+','+Math.floor(i/5);
            tile.style.background = this.explored[key] ? 'transparent' : '#408888'; tile.style.outline = key===sector ? '1px solid white' : '';
        }
    }
    private scan() {
        const planet = this.scene.playerShip.cursorOnPlanet || this.scene.playerShip.stoppedOnPlanet;
        if (!planet || !this.isKnown(planet)) { this.log('Scanner > Orbit a planet first to record its details.'); return; }
        this.dialog('Scan Planet', '<h2 id="scan-name"></h2><p>Population: '+Math.round(planet.getTotalPopulationConsumed()).toLocaleString()+'</p><p>Resources: '+planet.resources.toFixed(1)+' · Allegiance: '+(planet.getAllegiance(this.scene.playerShip.team)||0).toFixed(0)+'%</p><p>Spaceport: '+Math.round(planet.spacePort*100)+'% · Industry: '+Math.round(planet.industry*100)+'% · Education: '+Math.round(planet.education*100)+'%</p>');
        document.getElementById('scan-name').textContent = planet.name;
    }
    private guide() {
        this.dialog('Planetary Guide', '<p>Known worlds. Choose a destination to engage autopilot.</p><div id="planet-guide"></div>');
        const list = document.getElementById('planet-guide');
        this.scene.level.planets.forEach((planet, i) => {
            if (!this.explored[Math.floor(planet.x/600)+','+Math.floor(planet.y/600)]) return;
            const b = document.createElement('button');
            b.textContent = planet.name + (this.visited[i] ? ' — ' + Math.round(planet.getTotalPopulationConsumed()).toLocaleString() + ' people · Ore ' + Math.round(planet.resources) : ' — Unsurveyed');
            b.onclick = () => { this.close(); this.scene.playerShip.navigate(planet.x, planet.y, planet); }; list.appendChild(b);
        });
    }
    private report() {
        const scores = this.scene.ui.getTotalScores();
        this.dialog('Empire Report', '<h2>The balance of power</h2><p>Your path: '+Math.round(scores.totalHuman).toLocaleString()+' people on '+scores.totalHumanPlanet+' worlds.</p><p>Opposing path: '+Math.round(scores.totalOrk).toLocaleString()+' people on '+scores.totalOrkPlanet+' worlds.</p><p>Win by bringing every inhabited world to your path. Neutral worlds can be won through investment.</p>');
    }
    private inventory() {
        this.dialog('Ship Inventory', '<div id="inventory-list"></div>');
        const ship = this.scene.playerShip, list = document.getElementById('inventory-list');
        this.scene.items.items.forEach(item => { const p=document.createElement('p'); p.textContent=item.name+': '+ship.items[item.key].amount; list.appendChild(p); });
        const p=document.createElement('p'); p.textContent='Capacity — Energy '+ship.maxEnergy+', charge '+ship.maxCharge+', cargo '+ship.maxCargo+', shields '+ship.maxShield; list.appendChild(p);
    }
    private help() {
        this.dialog('Warpath Flight Manual', '<h2>Your first colony</h2><ol><li>Left-click an empty planet to fly there and enter orbit.</li><li>Hold C or press Mine to collect ore. Mining lowers your shields.</li><li>Return to a friendly or neutral inhabited world and sell the cargo.</li><li>Buy cargo and energy pods, then carry colonists to an empty planet.</li><li>Invest in your colony. Spaceports improve refuelling; development earns tax income.</li></ol><h2>Flight & combat</h2><p>Left-click steers; only a planet destination stops you. Right-click fires at the selected point. 1–6 select weapons. +/− changes speed, Space stops, R reverses.</p><p>Use the galaxy map to steer or the planetary guide (G) to dock. Blue scanner sectors are unexplored; grey planets have not been surveyed. Click a captain to watch their ship.</p><p>Stealth disables your shields. Disrupters weaken all shields in your sector. Warp needs an installed drive and charge. Crossing the central energy barriers damages your ship.</p><h2>Modern conveniences</h2><p>P pauses. Escape closes a dialog or pauses. Dialogs and hidden tabs pause the simulation. Sound and captain preferences are remembered. File → Fullscreen enlarges the cockpit.</p><p>This is a solo remake; the original modem/network modes and full diplomatic simulation are not reproduced.</p>');
    }
}
