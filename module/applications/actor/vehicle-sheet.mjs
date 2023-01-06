import ActorSheetShaper from "./base-sheet.mjs";

/**
 * An Actor sheet for Vehicle type actors.
 */
export default class ActorSheetShaperVehicle extends ActorSheetShaper {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shaper", "sheet", "actor", "vehicle"]
    });
  }

  /* -------------------------------------------- */

  /**
   * Creates a new cargo entry for a vehicle Actor.
   * @type {object}
   */
  static get newCargo() {
    return {name: "", quantity: 1};
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /* -------------------------------------------- */

  /** @override */
  _getMovementSpeed(actorData, largestPrimary=true) {
    return super._getMovementSpeed(actorData, largestPrimary);
  }

  /* -------------------------------------------- */

  /**
   * Prepare items that are mounted to a vehicle and require one or more crew to operate.
   * @param {object} item  Copy of the item data being prepared for display. *Will be mutated.*
   * @private
   */
  _prepareCrewedItem(item) {

    // Determine crewed status
    const isCrewed = item.system.crewed;
    item.toggleClass = isCrewed ? "active" : "";
    item.toggleTitle = game.i18n.localize(`SHAPER.${isCrewed ? "Crewed" : "Uncrewed"}`);

    // Handle crew actions
    if (item.type === "feat" && item.system.activation.type === "crew") {
      item.cover = game.i18n.localize(`SHAPER.${item.system.cover ? "CoverTotal" : "None"}`);
      if (item.system.cover === .5) item.cover = "½";
      else if (item.system.cover === .75) item.cover = "¾";
      else if (item.system.cover === null) item.cover = "—";
    }

    // Prepare vehicle weapons
    if ( (item.type === "equipment") || (item.type === "weapon") ) {
      item.threshold = item.system.hp.dt ? item.system.hp.dt : "—";
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareItems(context) {
    const cargoColumns = [{
      label: game.i18n.localize("SHAPER.Quantity"),
      css: "item-qty",
      property: "quantity",
      editable: "Number"
    }];

    const equipmentColumns = [{
      label: game.i18n.localize("SHAPER.Quantity"),
      css: "item-qty",
      property: "system.quantity",
      editable: "Number"
    }, {
      label: game.i18n.localize("SHAPER.AC"),
      css: "item-ac",
      property: "system.armor.value"
    }, {
      label: game.i18n.localize("SHAPER.HP"),
      css: "item-hp",
      property: "system.hp.value",
      editable: "Number"
    }, {
      label: game.i18n.localize("SHAPER.Threshold"),
      css: "item-threshold",
      property: "threshold"
    }];

    const features = {
      actions: {
        label: game.i18n.localize("SHAPER.ActionPl"),
        items: [],
        hasActions: true,
        crewable: true,
        dataset: {type: "feat", "activation.type": "crew"},
        columns: [{
          label: game.i18n.localize("SHAPER.Cover"),
          css: "item-cover",
          property: "cover"
        }]
      },
      equipment: {
        label: game.i18n.localize("SHAPER.ItemTypeEquipment"),
        items: [],
        crewable: true,
        dataset: {type: "equipment", "armor.type": "vehicle"},
        columns: equipmentColumns
      },
      passive: {
        label: game.i18n.localize("SHAPER.Features"),
        items: [],
        dataset: {type: "feat"}
      },
      reactions: {
        label: game.i18n.localize("SHAPER.ReactionPl"),
        items: [],
        dataset: {type: "feat", "activation.type": "reaction"}
      },
      weapons: {
        label: game.i18n.localize("SHAPER.ItemTypeWeaponPl"),
        items: [],
        crewable: true,
        dataset: {type: "weapon", "weapon-type": "siege"},
        columns: equipmentColumns
      }
    };

    context.items.forEach(item => {
      const {uses, recharge} = item.system;
      item.hasUses = uses && (uses.max > 0);
      item.isOnCooldown = recharge && !!recharge.value && (recharge.charged === false);
      item.isDepleted = item.isOnCooldown && (uses.per && (uses.value > 0));
    });

    const cargo = {
      crew: {
        label: game.i18n.localize("SHAPER.VehicleCrew"),
        items: context.actor.system.cargo.crew,
        css: "cargo-row crew",
        editableName: true,
        dataset: {type: "crew"},
        columns: cargoColumns
      },
      passengers: {
        label: game.i18n.localize("SHAPER.VehiclePassengers"),
        items: context.actor.system.cargo.passengers,
        css: "cargo-row passengers",
        editableName: true,
        dataset: {type: "passengers"},
        columns: cargoColumns
      },
      cargo: {
        label: game.i18n.localize("SHAPER.VehicleCargo"),
        items: [],
        dataset: {type: "loot"},
        columns: [{
          label: game.i18n.localize("SHAPER.Quantity"),
          css: "item-qty",
          property: "system.quantity",
          editable: "Number"
        }, {
          label: game.i18n.localize("SHAPER.Price"),
          css: "item-price",
          property: "system.price",
          editable: "Number"
        }, {
          label: game.i18n.localize("SHAPER.Weight"),
          css: "item-weight",
          property: "system.weight",
          editable: "Number"
        }]
      }
    };

    // Classify items owned by the vehicle and compute total cargo weight
    let totalWeight = 0;
    for (const item of context.items) {
      this._prepareCrewedItem(item);

      // Handle cargo explicitly
      const isCargo = item.flags.shaper?.vehicleCargo === true;
      if ( isCargo ) {
        totalWeight += (item.system.weight || 0) * item.system.quantity;
        cargo.cargo.items.push(item);
        continue;
      }

      // Handle non-cargo item types
      switch ( item.type ) {
        case "weapon":
          features.weapons.items.push(item);
          break;
        case "equipment":
          features.equipment.items.push(item);
          break;
        case "feat":
          const act = item.system.activation;
          if ( !act.type || (act.type === "none") ) features.passive.items.push(item);
          else if (act.type === "reaction") features.reactions.items.push(item);
          else features.actions.items.push(item);
          break;
        default:
          totalWeight += (item.system.weight || 0) * item.system.quantity;
          cargo.cargo.items.push(item);
      }
    }

    // Update the rendering context data
    context.features = Object.values(features);
    context.cargo = Object.values(cargo);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if ( !this.isEditable ) return;

    html.find(".item-toggle").click(this._onToggleItem.bind(this));
    html.find(".item-hp input")
      .click(evt => evt.target.select())
      .change(this._onHPChange.bind(this));

    html.find(".item:not(.cargo-row) input[data-property]")
      .click(evt => evt.target.select())
      .change(this._onEditInSheet.bind(this));

    html.find(".cargo-row input")
      .click(evt => evt.target.select())
      .change(this._onCargoRowChange.bind(this));

    html.find(".item:not(.cargo-row) .item-qty input")
      .click(evt => evt.target.select())
      .change(this._onQtyChange.bind(this));

    if (this.actor.system.attributes.actions.stations) {
      html.find(".counter.actions, .counter.action-thresholds").hide();
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle saving a cargo row (i.e. crew or passenger) in-sheet.
   * @param {Event} event              Triggering event.
   * @returns {Promise<ActorShaper>|null}  Actor after update if any changes were made.
   * @private
   */
  _onCargoRowChange(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const row = target.closest(".item");
    const idx = Number(row.dataset.itemIndex);
    const property = row.classList.contains("crew") ? "crew" : "passengers";

    // Get the cargo entry
    const cargo = foundry.utils.deepClone(this.actor.system.cargo[property]);
    const entry = cargo[idx];
    if ( !entry ) return null;

    // Update the cargo value
    const key = target.dataset.property ?? "name";
    const type = target.dataset.dtype;
    let value = target.value;
    if (type === "Number") value = Number(value);
    entry[key] = value;

    // Perform the Actor update
    return this.actor.update({[`system.cargo.${property}`]: cargo});
  }

  /* -------------------------------------------- */

  /**
   * Handle editing certain values like quantity, price, and weight in-sheet.
   * @param {Event} event  Triggering event.
   * @returns {Promise<ItemShaper>}  Item with updates applied.
   * @private
   */
  _onEditInSheet(event) {
    event.preventDefault();
    const itemID = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemID);
    const property = event.currentTarget.dataset.property;
    const type = event.currentTarget.dataset.dtype;
    let value = event.currentTarget.value;
    switch (type) {
      case "Number": value = parseInt(value); break;
      case "Boolean": value = value === "true"; break;
    }
    return item.update({[`${property}`]: value});
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onItemCreate(event) {
    event.preventDefault();
    // Handle creating a new crew or passenger row.
    const target = event.currentTarget;
    const type = target.dataset.type;
    if (type === "crew" || type === "passengers") {
      const cargo = foundry.utils.deepClone(this.actor.system.cargo[type]);
      cargo.push(this.constructor.newCargo);
      return this.actor.update({[`system.cargo.${type}`]: cargo});
    }
    return super._onItemCreate(event);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onItemDelete(event) {
    event.preventDefault();
    // Handle deleting a crew or passenger row.
    const row = event.currentTarget.closest(".item");
    if (row.classList.contains("cargo-row")) {
      const idx = Number(row.dataset.itemIndex);
      const type = row.classList.contains("crew") ? "crew" : "passengers";
      const cargo = foundry.utils.deepClone(this.actor.system.cargo[type]).filter((_, i) => i !== idx);
      return this.actor.update({[`system.cargo.${type}`]: cargo});
    }
    return super._onItemDelete(event);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropSingleItem(itemData) {
    const cargoTypes = ["weapon", "equipment", "consumable", "tool", "loot", "backpack"];
    const isCargo = cargoTypes.includes(itemData.type) && (this._tabs[0].active === "cargo");
    foundry.utils.setProperty(itemData, "flags.shaper.vehicleCargo", isCargo);
    return super._onDropSingleItem(itemData);
  }

  /* -------------------------------------------- */

  /**
   * Special handling for editing HP to clamp it within appropriate range.
   * @param {Event} event  Triggering event.
   * @returns {Promise<ItemShaper>}  Item after the update is applied.
   * @private
   */
  _onHPChange(event) {
    event.preventDefault();
    const itemID = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemID);
    const hp = Math.clamped(0, parseInt(event.currentTarget.value), item.system.hp.max);
    event.currentTarget.value = hp;
    return item.update({"system.hp.value": hp});
  }

  /* -------------------------------------------- */

  /**
   * Special handling for editing quantity value of equipment and weapons inside the features tab.
   * @param {Event} event  Triggering event.
   * @returns {Promise<ItemShaper>}  Item after the update is applied.
   * @private
   */
  _onQtyChange(event) {
    event.preventDefault();
    const itemID = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemID);
    const qty = parseInt(event.currentTarget.value);
    event.currentTarget.value = qty;
    return item.update({"system.quantity": qty});
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling an item's crewed status.
   * @param {Event} event  Triggering event.
   * @returns {Promise<ItemShaper>}  Item after the toggling is applied.
   * @private
   */
  _onToggleItem(event) {
    event.preventDefault();
    const itemID = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemID);
    return item.update({"system.crewed": !item.system.crewed});
  }
}
