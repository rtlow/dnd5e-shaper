/**
 * A simple form to set actor movement speeds.
 */
export default class ActorMovementConfig extends DocumentSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shaper"],
      template: "systems/shaper/templates/apps/movement-config.hbs",
      width: 300,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${game.i18n.localize("SHAPER.MovementConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const data = {
      movement: this.document.toObject().system?.attributes?.movement || {},
      units: CONFIG.SHAPER.movementUnits
    };
    for ( let [k, v] of Object.entries(data.movement) ) {
      if ( ["units", "hover"].includes(k) ) continue;
      data.movement[k] = Number.isNumeric(v) ? v.toNearest(0.1) : 0;
    }
    return data;
  }
}
