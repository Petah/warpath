import DefaultScene from "./scenes/default";
import Entity from "./entity";
import Ship from "./ship";
import SoundManager from "./soundmanager";

const $ = (selector) => {
    return new Element(<any>document.querySelectorAll(selector));
};

const e = (tagName) => {
    return new Element([document.createElement(tagName)]);
};

class Element {
    constructor(
        public elements: HTMLElement[]
    ) {
    }

    show() {
        for (const el of this.elements) {
            el.style.display = '';
        }
        return this;
    }

    hide() {
        for (const el of this.elements) {
            el.style.display = 'none';
        }
        return this;
    }

    addEventListener(event: string, callback: (event: any) => void) {
        for (const el of this.elements) {
            el.addEventListener(event, callback);
        }
        return this;
    }

    text(text: string) {
        for (const el of this.elements) {
            el.innerText = text;
        }
        return this;
    }

    is(element: HTMLElement) {
        for (const el of this.elements) {
            if (el == element) {
                return true;
            }
        }
        return false;
    }

    attr(attrs) {
        for (const el of this.elements) {
            for (const key in attrs) {
                el.setAttribute(key, attrs[key]);
            }
        }
        return this;
    }

    removeAttr(name) {
        for (const el of this.elements) {
            el.removeAttribute(name);
        }
    }

    style(styles) {
        for (const el of this.elements) {
            for (const key in styles) {
                el.style[key] = styles[key];
            }
        }
        return this;
    }

    append(child: Element) {
        for (const el of this.elements) {
            el.appendChild(child.elements[0]);
            break;
        }
        return this;
    }

    setActive(on: boolean) {
        for (const el of this.elements) {
            if (on) {
                el.classList.add("active");
            }
            else {
                el.classList.remove("active");
            }
            break;
        }
        return this
    }
    getActive() {
        for (const el of this.elements) {
            return el.classList.contains("active")
        }
        return false
    }
}

export default class UI implements Entity {
    public static width = 600;
    public static height = 600;

    private modalWrapper: Element;

    public playerShip: Ship = null;
    public enemyShip0: Ship = null;
    public enemyShip1: Ship = null;
    public enemyShip2: Ship = null;

    private shipEnergyBar: Element;
    private shipEnergyPods: Element;
    private shipChargeBar: Element;
    private shipChargePods: Element;
    private shipCargoBar: Element;
    private shipCargoPods: Element;
    private shipShieldBar: Element;
    private shipShieldPods: Element;
    private shipShields: Element;
    private shipMoney: Element;
    private shipColonists: Element;
    private totalPlanets: Element;

    private itemTorpedoCount: Element;
    private itemHotTorpedoCount: Element;
    private itemMineCount: Element;
    private itemNukeCount: Element;
    private itemBioCount: Element;
    private itemWarpCount: Element;

    private planetName: Element;
    private planetInhabitance: Element;
    private planetPopulation: Element;
    private planetSickness: Element;
    private planetInfrastructure: Element;
    private planetResource: Element;

    private minimapShip1: Element;
    private minimapShip2: Element;
    private minimapShip3: Element;
    private minimapShip4: Element;

    private gauge: Element;
    private needle: Element;
    private mineButton: Element;
    private populateButton: Element;
    private investButton: Element;
    private buyButton: Element;

    private itemLaserButton: Element;
    private itemTorpedoButton: Element;
    private itemMineButton: Element;
    private itemHotTorpedoButton: Element;
    private itemNeutronBombButton: Element;
    private itemPlagueBombButton: Element;
    private itemShieldButton: Element;
    private itemCloakButton: Element;
    private itemDisrupterButton: Element;
    private itemWarpButton: Element;
    private itemPlagueCureButton: Element;
    private itemWeaponButtons: Array<Element>;

    private currentItem = 0;

    private time: Element;
    private timeImage: Element;
    private menuAudio: Phaser.Sound.BaseSound = null;

    constructor(
        private scene: DefaultScene
    ) {
        this.modalWrapper = $('#modal-wrapper');

        this.shipEnergyBar = $('#energy-bar');
        this.shipEnergyPods = $('#energy-pods');
        this.shipChargeBar = $('#charge-bar');
        this.shipChargePods = $('#charge-pods');
        this.shipCargoBar = $('#cargo-bar');
        this.shipCargoPods = $('#cargo-pods');
        this.shipShieldBar = $('#shield-bar');
        this.shipShieldPods = $('#shield-pods');
        this.shipShields = $('#ship-shields');
        this.shipMoney = $('.ship-money');
        this.shipColonists = $('.ship-colonists');
        this.totalPlanets = $('#total-planets');

        this.itemTorpedoCount = $('#item-torpedo-count');
        this.itemMineCount = $('#item-mine-count');
        this.itemHotTorpedoCount = $('#item-hot-torpedo-count');
        this.itemMineCount = $('#item-mine-count');
        this.itemNukeCount = $('#item-nuke-count');
        this.itemBioCount = $('#item-bio-count');
        this.itemWarpCount = $('#item-warp-count');

        this.planetName = $('#planet-name');
        this.planetInhabitance = $('#planet-inhabitance');
        this.planetPopulation = $('#planet-population');

        this.planetSickness = $('#planet-sickness');
        this.planetInfrastructure = $('#planet-infrastructure');
        this.planetResource = $('#planet-resource');

        this.minimapShip1 = $('#minimap-ship-1');
        this.minimapShip2 = $('#minimap-ship-2');
        this.minimapShip3 = $('#minimap-ship-3');
        this.minimapShip4 = $('#minimap-ship-4');

        this.time = $('#time');
        this.timeImage = $('#time-seg img');

        this.gauge = $('.gauge-center');
        this.needle = $('.needle');
        this.mineButton = $('#mine');
        this.populateButton = $('#populate');
        this.investButton = $('#open-invest');
        this.buyButton = $('#open-buy');

        this.itemLaserButton = $('#item-laser');
        this.itemTorpedoButton = $('#item-torpedo');
        this.itemMineButton = $('#item-mine');
        this.itemHotTorpedoButton = $('#item-hot-torpedo');
        this.itemNeutronBombButton = $('#item-nuke');
        this.itemPlagueBombButton = $('#item-bio');
        this.itemShieldButton = $('#item-shields');
        this.itemCloakButton = $('#item-cloak');
        this.itemDisrupterButton = $('#item-sun');
        this.itemWarpButton = $('#item-warp');
        this.itemPlagueCureButton = $('#item-anti-bio');

        this.itemWeaponButtons = [
            this.itemLaserButton,
            this.itemTorpedoButton,
            this.itemMineButton,
            this.itemHotTorpedoButton,
            this.itemNeutronBombButton,
            this.itemPlagueBombButton
        ];

        $('.cancel-modal').addEventListener('click', () => {
            this.playMenuAudio();
            this.hideModals();
        });

        $('#sell-all').addEventListener('click', () => {
            this.playMenuAudio();
            this.playerShip.sell();
            this.modalWrapper.hide();
        });

        $('#sell-1000').addEventListener('click', () => {
            this.playMenuAudio();
            this.playerShip.sell(1);
            this.modalWrapper.hide();
        });

        this.mineButton.addEventListener('click', () => {
            this.playMenuAudio();
            this.playerShip.playerMine();
        });

        this.populateButton.addEventListener('click', () => {
            this.playMenuAudio();
            this.playerShip.populatePlanet();
        });

        $('#modal-wrapper').addEventListener('click', (event) => {
            this.playMenuAudio();
            if (this.modalWrapper.is(event.target)) {
                this.hideModals();
            }
        });

        this.investButton.addEventListener('click', () => {
            if (this.playerShip && this.playerShip.stoppedOnPlanet && this.playerShip.stoppedOnPlanet.canInvest) {
                this.showModal('modal-invest');
                this.updateInvestValues();
            }
        });

        this.buyButton.addEventListener('click', () => {
            if (this.playerShip && this.playerShip.stoppedOnPlanet && this.playerShip.stoppedOnPlanet.canSell) {
                this.showItem(this.currentItem);
                this.showModal('modal-buy');
                this.toggleBuyButtons();
            }
        });

        this.itemLaserButton.addEventListener('click', () => {
            this.selectWeaponButton(this.itemLaserButton, null);
        });

        this.itemTorpedoButton.addEventListener('click', () => {
            this.selectWeaponButton(this.itemTorpedoButton, 'torpedo');
        });

        this.itemMineButton.addEventListener('click', () => {
            this.selectWeaponButton(this.itemMineButton, 'mine');
        });

        this.itemHotTorpedoButton.addEventListener('click', () => {
            this.selectWeaponButton(this.itemHotTorpedoButton, 'hot-torpedo');
        });

        this.itemNeutronBombButton.addEventListener('click', () => {
            this.selectWeaponButton(this.itemNeutronBombButton, 'nuke');
        });

        this.itemPlagueBombButton.addEventListener('click', () => {
            this.selectWeaponButton(this.itemPlagueBombButton, 'bio');
        });

        this.itemShieldButton.addEventListener('click', () => {
            this.playMenuAudio();
        });

        this.itemCloakButton.addEventListener('click', () => {
            this.playMenuAudio();
        });

        this.itemDisrupterButton.addEventListener('click', () => {
            this.playMenuAudio();
        });

        this.itemWarpButton.addEventListener('click', () => {
            
            this.playMenuAudio();
            
            var active = this.itemWarpButton.getActive();
            this.itemWarpButton.setActive(!active);
            
        });

        this.itemPlagueCureButton.addEventListener('click', () => {
            this.playMenuAudio();
        });

        $('#next-item').addEventListener('click', () => {
            this.playMenuAudio();
            this.currentItem++;
            if (this.currentItem >= this.scene.items.items.length) {
                this.currentItem = 0;
            }
            this.showItem(this.currentItem);
            this.toggleBuyButtons();
        });

        $('#prev-item').addEventListener('click', () => {
            this.playMenuAudio();
            this.currentItem--;
            if (this.currentItem < 0) {
                this.currentItem = this.scene.items.items.length - 1;
            }
            this.showItem(this.currentItem);
            this.toggleBuyButtons();
        });

        $('#modal-invest-mining').addEventListener('click', () => {
            this.playMenuAudio();
            if (this.playerShip == null) {
                return;
            }

            let planet = this.playerShip.stoppedOnPlanet;
            if (planet
                && planet.canInvest(this.playerShip.team)
                && planet.remainingInvestmentInMining() > 0) {

            }
        })

        $('#buy-1').addEventListener('click', () => {
            this.playMenuAudio();
            const item = this.scene.items.items[this.currentItem];
            this.playerShip.buyItem(item, 1);
            this.toggleBuyButtons();
        });

        $('#buy-10').addEventListener('click', () => {
            this.playMenuAudio();
            const item = this.scene.items.items[this.currentItem];
            this.playerShip.buyItem(item, 10);
            this.toggleBuyButtons();
        });

        $('#buy-100').addEventListener('click', () => {
            this.playMenuAudio();
            const item = this.scene.items.items[this.currentItem];
            this.playerShip.buyItem(item, 100);
            this.toggleBuyButtons();
        });

        $('#invest-shield-button').addEventListener('click', () => {
            this.playerShip.invest('defence');
            this.updateInvestValues();
        });

        $('#invest-education-button').addEventListener('click', () => {
            this.playerShip.invest('education');
            this.updateInvestValues();
        });

        $('#invest-industry-button').addEventListener('click', () => {
            this.playerShip.invest('industry');
            this.updateInvestValues();
        });

        $('#invest-mining-button').addEventListener('click', () => {
            this.playerShip.invest('mining');
            this.updateInvestValues();
        });

        $('#invest-spaceport-button').addEventListener('click', () => {
            this.playerShip.invest('spacePort');
            this.updateInvestValues();
        });

        $('#invest-agriculture-button').addEventListener('click', () => {
            this.playerShip.invest('agriculture');
            this.updateInvestValues();
        });
        $('#minimap').addEventListener('click', (event) => {            

            const warpCharge = 1.0;

            const isButtonActive = this.itemWarpButton.getActive();
            const hasEnoughCharge = this.playerShip.charge >= warpCharge;
            const hasWarpItem = this.playerShip.items['warp-drive'].amount > 0;

            if (isButtonActive && hasEnoughCharge && hasWarpItem) {
                this.playerShip.items['warp-drive'].amount--;
                this.playerShip.charge -= warpCharge;

                this.playerShip.warp(
                    event.offsetX / 208 * this.scene.level.width,
                    event.offsetY / 208 * this.scene.level.height
                );
            }
        });
    }

    private updateInvestValues() {
        $('#invest-agriculture').text(this.numberWithCommas(this.playerShip.stoppedOnPlanet.agriculture * 100, 0));
        $('#invest-shield').text(this.numberWithCommas(this.playerShip.stoppedOnPlanet.defence * 100, 0));
        $('#invest-education').text(this.numberWithCommas(this.playerShip.stoppedOnPlanet.education * 100, 0));
        $('#invest-industry').text(this.numberWithCommas(this.playerShip.stoppedOnPlanet.industry * 100, 0));
        $('#invest-mining').text(this.numberWithCommas(this.playerShip.stoppedOnPlanet.mining * 100, 0));
        $('#invest-spaceport').text(this.numberWithCommas(this.playerShip.stoppedOnPlanet.spacePort * 100, 0));
    }

    private toggleBuyButtons() {
        const item = this.scene.items.items[this.currentItem];
        if (this.playerShip.money >= item.price) {
            $('#buy-1').removeAttr('disabled');
        } else {
            $('#buy-1').attr({
                disabled: 'disabled',
            });
        }
        if (this.playerShip.money >= item.price * 10) {
            $('#buy-10').removeAttr('disabled');
        } else {
            $('#buy-10').attr({
                disabled: 'disabled',
            });
        }
        if (this.playerShip.money >= item.price * 100) {
            $('#buy-100').removeAttr('disabled');
        } else {
            $('#buy-100').attr({
                disabled: 'disabled',
            });
        }
    }

    private showItem(itemNumber) {
        const item = this.scene.items.items[itemNumber];
        $('#item-name').text(item.name);
        $('#item-description').text(item.description);
        $('#item-price').text(this.numberWithCommas(item.price, 0));
        $('#item-quantity').text('100');
        $('#item-icon').attr({
            src: item.icon,
        });
    }

    public showModalSell() {
        const tons = Math.round(this.playerShip.cargo * 1000);
        if (tons > 1000) {
            $('#sell-1000-tons').show();
            $('#sell-1000-tons-amount').text(this.numberWithCommas(this.playerShip.getSellAmount(1), 0));
        } else {
            $('#sell-1000-tons').hide();
        }
        $('#sell-all-tons').text(this.numberWithCommas(tons, 0));
        $('#sell-all-tons-amount').text(this.numberWithCommas(this.playerShip.getSellAmount(), 0));
        this.showModal('modal-sell');
    }

    private numberWithCommas(n: number, dp: number) {
        var parts = n.toFixed(dp).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    public showModal(id) {
        this.hideModals();
        const el = $('#' + id);
        this.modalWrapper.show();
        el.show();

        this.playMenuAudio();
    }

    private hideModals() {
        this.modalWrapper.hide();
        $('#modal-sell').hide();
        $('#modal-buy').hide();
        $('#modal-invest').hide();
    }

    private getBarAmount(amount, max) {
        if (amount <= 0) {
            return 0;
        }
        if (amount == max) {
            return 100;
        }
        return ((amount % 1) * 100).toFixed(2);
    }

    private getPodCount(amount, max) {
        return Math.floor(amount - 0.001);
    }

    public update() {
    }

    public updateUi() {
        if (this.playerShip) {
            this.shipEnergyBar.style({
                width: this.getBarAmount(this.playerShip.energy, this.playerShip.maxEnergy) + '%',
            });
            this.shipEnergyPods.attr({
                class: 'pods pods-' + this.getPodCount(this.playerShip.energy, this.playerShip.maxEnergy) + ' pods-max-' + Math.max(0, Math.floor(this.playerShip.maxEnergy - 1)),
            });

            this.shipChargeBar.style({
                width: this.getBarAmount(this.playerShip.charge, this.playerShip.maxCharge) + '%',
            });
            this.shipChargePods.attr({
                class: 'pods pods-' + this.getPodCount(this.playerShip.charge, this.playerShip.maxCharge) + ' pods-max-' + Math.max(0, Math.floor(this.playerShip.maxCharge - 1)),
            });

            this.shipCargoBar.style({
                width: this.getBarAmount(this.playerShip.cargo, this.playerShip.maxCargo) + '%',
            });
            this.shipCargoPods.attr({
                class: 'pods pods-' + this.getPodCount(this.playerShip.cargo, this.playerShip.maxCargo) + ' pods-max-' + Math.max(0, Math.floor(this.playerShip.maxCargo - 1)),
            });

            this.shipShieldBar.style({
                width: this.getBarAmount(this.playerShip.shield, this.playerShip.maxShield) + '%',
            });
            this.shipShieldPods.attr({
                class: 'pods pods-' + this.getPodCount(this.playerShip.shield, this.playerShip.maxShield) + ' pods-max-' + Math.max(0, Math.floor(this.playerShip.maxShield - 1)),
            });

            this.shipShields.text(this.numberWithCommas(this.playerShip.maxShield, 0));
            this.shipMoney.text(this.numberWithCommas(this.playerShip.money, 0));
            this.shipColonists.text(this.numberWithCommas(this.playerShip.colonists, 0));

            this.itemTorpedoCount.text(this.numberWithCommas(this.playerShip.items['torpedo'].amount, 0));
            this.itemMineCount.text(this.numberWithCommas(this.playerShip.items['mine'].amount, 0));
            this.itemHotTorpedoCount.text(this.numberWithCommas(this.playerShip.items['hot-torpedo'].amount, 0));
            this.itemNukeCount.text(this.numberWithCommas(this.playerShip.items['nuke'].amount, 0));
            this.itemBioCount.text(this.numberWithCommas(this.playerShip.items['bio'].amount, 0));
            this.itemWarpCount.text(this.numberWithCommas(this.playerShip.items['warp-drive'].amount, 0));

            if (this.playerShip.canMine()) {
                this.mineButton.removeAttr('disabled');
            } else {
                this.mineButton.attr({
                    disabled: 'disabled',
                });
            }

            if (this.playerShip.canPopulate()) {
                this.populateButton.removeAttr('disabled');
            } else {
                this.populateButton.attr({
                    disabled: 'disabled',
                });
            }

            if (this.playerShip.canBuy()) {
                this.buyButton.removeAttr('disabled');
            } else {
                this.buyButton.attr({
                    disabled: 'disabled',
                });
            }

            if (this.playerShip.canInvest()) {
                this.investButton.removeAttr('disabled');
            } else {
                this.investButton.attr({
                    disabled: 'disabled',
                });
            }

            if (this.playerShip.stoppedOnPlanet) {
                this.planetName.text(this.playerShip.stoppedOnPlanet.name);
                this.planetInhabitance.text('Uninhabited');
                this.planetPopulation.text(this.numberWithCommas(this.playerShip.stoppedOnPlanet.getTotalPopulationConsumed(), 0));
                this.planetSickness.style({
                    height: this.numberWithCommas(this.playerShip.stoppedOnPlanet.sickness, 2) + '%',
                });
                this.planetInfrastructure.style({
                    height: this.numberWithCommas(this.playerShip.stoppedOnPlanet.infrastructureLevel / 6 * 100, 2) + '%',
                });
                this.planetResource.style({
                    height: this.numberWithCommas(this.playerShip.stoppedOnPlanet.resources, 2) + '%',
                });
                $('#planet-inhabitance-image img').attr({
                    src: 'assets/original/' + this.playerShip.stoppedOnPlanet.spriteNameFor(this.playerShip.stoppedOnPlanet.planetType) + '.png',
                });

                const allegiance = this.playerShip.stoppedOnPlanet.getAllegiance(this.playerShip.team);
                if (allegiance === null) {
                    this.gauge.attr({
                        'data-before': 'N/A',
                    })
                    this.needle.style({
                        transform: 'rotate(90deg)',
                    });
                } else {
                    this.gauge.attr({
                        'data-before': allegiance,
                    })
                    this.needle.style({
                        transform: 'rotate(' + (180 * (allegiance / 100)) + 'deg)',
                    });
                }
                // console.log(this.playerShip.stoppedOnPlanet.maxInfrastructureLevel, this.playerShip.stoppedOnPlanet.infrastructureLevel);
            }

            this.minimapShip1.style({
                left: (this.playerShip.x / this.scene.level.width * 100) + '%',
                top: (this.playerShip.y / this.scene.level.height * 100) + '%',
            });
            this.minimapShip2.style({
                left: (this.enemyShip0.x / this.scene.level.width * 100) + '%',
                top: (this.enemyShip0.y / this.scene.level.height * 100) + '%',
            });
            this.minimapShip3.style({
                left: (this.enemyShip1.x / this.scene.level.width * 100) + '%',
                top: (this.enemyShip1.y / this.scene.level.height * 100) + '%',
            });
            this.minimapShip4.style({
                left: (this.enemyShip2.x / this.scene.level.width * 100) + '%',
                top: (this.enemyShip2.y / this.scene.level.height * 100) + '%',
            });
        }
    }

    slowUpdate() {
        this.time.text('Year: ' + this.numberWithCommas(this.scene.gameTime / 10, 1));
        this.timeImage.attr({
            src: 'assets/seg-' + Math.round(10 - ((this.scene.gameTime / 10) % 1) * 10) + '.png',
        });
        const {
            totalHuman,
            totalHumanPlanet,
            totalOrk,
        } = this.getTotalScores();
        $('#score-us').text(this.numberWithCommas(totalHuman, 0));
        $('#score-them').text(this.numberWithCommas(totalOrk, 0));
        $('#total-planets').text(this.numberWithCommas(totalHumanPlanet, 0));
    }

    public getTotalScores() {
        let totalHuman = 0;
        let totalHumanPlanet = 0;
        let totalOrk = 0;
        let totalOrkPlanet = 0;
        for (let planet of this.scene.level.planets) {
            if (planet.populations.species && planet.populations.species.speciesName == 'Human') {
                totalHuman += planet.getTotalPopulationConsumed();
                totalHumanPlanet++;
            }
            if (planet.populations.species && planet.populations.species.speciesName == 'Ork') {
                totalOrk += planet.getTotalPopulationConsumed();
                totalOrkPlanet++;
            }
        }
        return {
            totalHuman,
            totalHumanPlanet,
            totalOrk,
            totalOrkPlanet,
        }
    }

    public lose() {
        $('#splash-lose').show();
        this.scene.soundManager.play('nooo');
        this.scene.game.scene.stop('default');
    }

    public win() {
        $('#splash-win').show();
        this.scene.game.scene.stop('default');
    }

    public drawMiniMap() {
        const minimap = $('#minimap');
        for (const planet of this.scene.level.planets) {
            const xp = planet.x / this.scene.level.width;
            const yp = planet.y / this.scene.level.height;
            minimap.append(e('div').attr({
                class: 'minimap-planet',
            }).style({
                left: (xp * 100) + '%',
                top: (yp * 100) + '%',
                backgroundColor: planet.getPlanetColor(this.playerShip.team),
            }));
        }
    }

    playMenuAudio() {
        this.scene.soundManager.play("menu_switch");
    }

    selectWeaponButton(selectedButton: Element, weapon: string) {
        this.playMenuAudio();
        var changed = false;
        for (const weaponButton of this.itemWeaponButtons) {
            weaponButton.setActive(weaponButton == selectedButton);
        }
        this.playerShip.weapon = weapon;
    }
}
