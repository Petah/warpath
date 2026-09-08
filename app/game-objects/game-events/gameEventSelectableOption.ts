import GameEventSelectableOptionAction from './gameEventSelectableOptionAction';

export default class GameEventSelectableOption {
    text: string;
    action: GameEventSelectableOptionAction;

    constructor(text: string, action: GameEventSelectableOptionAction) {
        this.text = text;
        this.action = action;
    }
}
