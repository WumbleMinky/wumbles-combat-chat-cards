/* 



*/
export function getSetting(key){
	return game.settings.get(WumblesCombatChatCard.moduleName, key);
}

export class WumblesCombatChatCard {
	static moduleName = "wumbles-combat-chat-cards";
	static itemCardTemlate = "modules/wumbles-combat-chat-cards/templates/item-card.html";
	static attackResultTemplate = "modules/wumbles-combat-chat-cards/templates/attack-result.html";
	static hasAttacked = false;
	
	static init(){
		game.settings.register(WumblesCombatChatCard.moduleName, "mergeCard", {
			name: game.i18n.localize("WumbleMinkysCombatChatCard.mergeCard.name"),
			hint: game.i18n.localize("WumbleMinkysCombatChatCard.mergeCard.hint"),
			scope: "world",
			config: true,
			default: true,
			type: Boolean
		});
		
		game.settings.register(WumblesCombatChatCard.moduleName, "onlyAttackAdds", {
			name: game.i18n.localize("WumbleMinkysCombatChatCard.onlyAttackAdds.name"),
			hint: game.i18n.localize("WumbleMinkysCombatChatCard.onlyAttackAdds.hint"),
			scope: "world",
			config: true,
			default: true,
			type: Boolean
		});
	
		if (game.modules.get("lib-wrapper")?.active){
			libWrapper.register(WumblesCombatChatCard.moduleName, "CONFIG.Item.documentClass.prototype.rollAttack", WumblesCombatChatCard.replaceAttackRoll, "MIXED");
			libWrapper.register(WumblesCombatChatCard.moduleName, "CONFIG.Item.documentClass.prototype.rollDamage", WumblesCombatChatCard.replaceDamageRoll, "MIXED");
			libWrapper.register(WumblesCombatChatCard.moduleName, "CONFIG.Item.documentClass.prototype.displayCard", WumblesCombatChatCard.wrapItemCards, "MIXED");
			libWrapper.register(WumblesCombatChatCard.moduleName, "CONFIG.Item.documentClass.prototype.rollFormula", WumblesCombatChatCard.replaceFormulaRoll, "MIXED");
			libWrapper.register(WumblesCombatChatCard.moduleName, "dnd5e.documents.Actor5e.prototype.rollAbilitySave", WumblesCombatChatCard.replaceSavingThrow, "MIXED");
		}
		
		loadTemplates([WumblesCombatChatCard.itemCardTemlate, WumblesCombatChatCard.attackResultTemplate]);
	}
	
	static init_hooks(){
		Hooks.on("renderChatMessage", WumblesCombatChatCard.renderChatMessage.bind(this));
		
	}
		
	static renderChatMessage(message, html, data){
		if (message.blind && !game.user?.isGM ){
			html.find(".wccc-attack-roll").find(".dice-roll").replaceWith(`<span class="wccc-blind-roll">${game.i18n.localize("WumbleMinkysCombatChatCard.diceRolled")}</span>`);
			html.find(".wccc-damage-roll").find(".dice-roll").replaceWith(`<span class="wccc-blind-roll">${game.i18n.localize("WumbleMinkysCombatChatCard.diceRolled")}</span>`);
			html.find(".wccc-saving-throw").find(".dice-roll").replaceWith(`<span class="wccc-blind-roll">${game.i18n.localize("WumbleMinkysCombatChatCard.diceRolled")}</span>`);
			html.find(".wccc-other-formula").find(".dice-roll").replaceWith(`<span class="wccc-blind-roll">${game.i18n.localize("WumbleMinkysCombatChatCard.diceRolled")}</span>`);
		}

		//this is for the modifying the default damage chat card
		if (message.flags?.dnd5e?.roll?.type === "damage"){
			WumblesCombatChatCard.addDamageButtons(message.rolls[0], html);
		}
		
		html.find(".wccc-damage-button").each( function(i, btn) {
			$(this).click( function(clickEvent) {
				clickEvent.stopPropagation();
				WumblesCombatChatCard.damageButtonAction($(this).data("roll"), $(this).data("multi")) 
			});
		});
		
		if (getSetting("mergeCard")) {
			html.on("click", ".wccc-attack-result-title", function(clickEvent) {				
				let content = clickEvent.currentTarget.closest(".wccc-attack-result").querySelector(".wccc-hidable-content");
				content.style.display = content.style.display === "none" ? "block" : "none";
			});
			html.on("click", ".wccc-target-title", function(clickEvent) {
				let alreadyTargetted = undefined;
				$(clickEvent.target).parent().parent().find(".wccc-target-image").each(function(index, element){
				let token = canvas.tokens.get(element.dataset.targetId);				
					if (game.user.isGM){
						if (alreadyTargetted == undefined)
							alreadyTargetted = token.controlled;
						if (alreadyTargetted)
							token.release();
						else
							token.control({releaseOthers:false});
					}else{
						if (alreadyTargetted == undefined)
							alreadyTargetted = token.isTargeted;
						token.setTarget(!alreadyTargetted, {releaseOthers: false});
					}
				});
			});
			html.on("click", ".wccc-target-image", function(clickEvent) {
				let token = canvas.tokens.get(clickEvent.target.dataset.targetId);
				if (game.user.isGM){
					if (token.controlled)
						token.release();
					else
						token.control();
				}else{
					token.setTarget(!token.isTargeted);
				}
			});
		}		
	}
	
	/****************************************************************
		All the methods related to adding the damage buttons
	*****************************************************************/
	
	static addDamageButtons(roll, html){
		let wasHTMLconverted = false
		if (!(html instanceof Object)){
			html = WumblesCombatChatCard.convertToJQuery(html);
			wasHTMLconverted = true;
		}
		
		const buttonContainer = $('<span class="btn-container-wccc"></span>');
		const style = "top:0px;position:relative; color:blue";
		
		const dmgButton = WumblesCombatChatCard.makeDamageButton(roll, "full", `background-color:lightcoral;${style}`, "fas fa-user-minus", "Full Damage", "", 1);
		const halfButton = WumblesCombatChatCard.makeDamageButton(roll, "half", `background-color:lightcoral;${style}`, "", "Half Damage", "&frac12;", 0.5);
		const quarterButton = WumblesCombatChatCard.makeDamageButton(roll, "quarter", `background-color:lightcoral;${style}`, "", "Quarter Damage", "&frac14;", 0.25);
		const doubleButton = WumblesCombatChatCard.makeDamageButton(roll, "double", `background-color:lightcoral;${style}`, "", "Double Damage", "x2", 2);
		const healingButton = WumblesCombatChatCard.makeDamageButton(roll, "healing", `background-color:limegreen; ${style}`, "fas fa-medkit", "Healing", "", -1);
		const tempButton = WumblesCombatChatCard.makeDamageButton(roll, "healing", `background-color:lightgreen; ${style}`, "fas fa-shield", "Temp HP", "", -2);
		
		buttonContainer.append(dmgButton);
		buttonContainer.append(halfButton);
		buttonContainer.append(quarterButton);
		buttonContainer.append(doubleButton);
		buttonContainer.append(healingButton);
		buttonContainer.append(tempButton);
		
		const totalHTML = html.find(".dice-total");
		totalHTML.addClass("dmgBtn-wccc");
		totalHTML.append(buttonContainer); 		
		
		html.find('.btn-container-wccc').hide();
		$(html).hover(eventIn => {
			html.find('.btn-container-wccc').show();
		}, eventOut => {
			html.find('.btn-container-wccc').hide();
		});
		
		if (wasHTMLconverted)
			return html;
	}
	
	static damageButtonAction(rollTotal, multiplier){
		if (canvas?.tokens?.controlled && canvas.tokens.controlled.length > 0) {
			canvas.tokens.controlled.forEach( function(controlledToken) {
				let actorUpdates = {};
				let HP = getProperty(controlledToken.actor, "system.attributes.hp");
				
				if (multiplier > 0){ 			// apply damage
					let totalDamage = Math.floor(rollTotal * multiplier);
					let tempHP = HP.temp ?? 0;
					if (tempHP > 0){			// remove temp HP first and reduce the total damage if necessary
						let newTemp = Math.max(tempHP - totalDamage, 0);
						totalDamage = newTemp == 0 ? totalDamage - tempHP : 0;
						actorUpdates["system.attributes.hp.temp"] = newTemp;
					}
					if (totalDamage > 0){
						actorUpdates["system.attributes.hp.value"] = HP.value - totalDamage;
					}
				}else if(multiplier == -1){		//apply healing
					actorUpdates["system.attributes.hp.value"] = Math.min(HP.max, HP.value + rollTotal);
				}else if(multiplier == -2){		//apply temporary HP
					actorUpdates["system.attributes.hp.temp"] = rollTotal;
				}
				
				if (!isEmpty(actorUpdates)){	// Only update as long as updates are needed
					controlledToken.actor.update(actorUpdates);
				}
			});
		}
	}
	
	static makeDamageButton(roll, buttonClass, buttonStyle, iClass, iTitle, iText, multiplier){
		let btn =  $(`<button class="wccc-damage-button wccc-damage-button-${buttonClass}" data-roll="${roll.total}" data-multi="${multiplier}" style="${buttonStyle}"><i class="${iClass}" title="${iTitle}">${iText}</i></button>`);
		btn.off("click");
		return btn;
	}
	
	/********************************************************************
		All the methods related to merging the chat cards.
	********************************************************************/
	
	static async wrapItemCards(wrapped, options){
		// the "this" keep word refers to the item that the card belongs to.
		if (!getSetting("mergeCard"))
			return wrapped(options);
		let token = undefined;
		let tokens = this.actor.getActiveTokens();
		if (tokens.length > 0){
			token = tokens.find( t => t.controlled ) ?? tokens[0];
		}
		
		let targets = Array.from(game.user.targets);
		const templateData = {
			actor: this.actor,
			item: this,
			labels: this.labels,
			tokenId: token?.document?.uuid ?? null,
			data: await this.getChatData(),
			hasAttack: this.hasAttack,
			hasDamage: this.hasDamage,
			isHealing: this.isHealing,
			isVersatile: this.isVersatile,
			hasSave: this.hasSave,
			hasAreaTarget: this.hasAreaTarget,
			isTool: this.type == "tool",
			hasAbilityCheck: this.hasAbilityCheck,
			multipleTargets: targets.length > 1,
			hasTarget: targets.length > 0,
			targets: targets,
			isSpell: this.type === "spell",
			isPower: this.type === "power"
		};
		
		let wumbleTags = { 
			hasDamage: this.hasDamage,
			hasAttack: this.hasAttack,
			hasSave: this.hasSave,
			isHealing: this.isHealing,
			hasOther: this.system.formula != ""
		}
		
		const template = WumblesCombatChatCard.itemCardTemlate;
		const html = await renderTemplate(template, templateData);
		let messageData = {
			user: game.user?.id,
			type: CONST.CHAT_MESSAGE_TYPES.OTHER,
			content: html,
			flavor: this.system.chatFlavor || this.name,
			speaker: ChatMessage.getSpeaker({ actor: this.actor, token: (token?.document ?? token) }),
			flags: { }
		};
		messageData.flags[WumblesCombatChatCard.moduleName] = wumbleTags;
		messageData.flags = mergeObject(messageData.flags, options.flags);
		Hooks.callAll("dnd5e.preDisplayCard", this, messageData, options);
		ChatMessage.applyRollMode(messageData, options.rollMode ?? game.settings.get("core", "rollMode"));
		const card = await ChatMessage.create(messageData);
		Hooks.callAll("dnd5e.displayCard", this, card);
		WumblesCombatChatCard.hasAttacked = false;
		return card;
	}
	
	static async replaceAttackRoll(wrapped, options){
		// Change this to check settings to see if needed to combine rolls.
		if (!getSetting("mergeCard")){
			return wrapped(options);
		}
		
		options.chatMessage = false;
		let roll = await wrapped(options);		// get the roll from the default rolling prompt. the options.chatMessage = false prevents it from rendering
		if (!roll)
			return;
		let rollHTML = await roll.render();
		if (roll.isCritical){
			rollHTML = rollHTML.replace('dice-total', 'dice-total critical');
		}
		if (roll.isFumble){
			rollHTML = rollHTML.replace('dice-total', 'dice-total fumble');
		}
		
		await WumblesCombatChatCard.addRollToItemCard(options.event, roll, rollHTML, "wccc-attack-roll", true);
	}
	
	static async replaceDamageRoll(wrapped, options){	
		// Change this to check settings to see if needed to combine rolls.
		if (!getSetting("mergeCard")){
			return wrapped(options);
		}
		
		let item = WumblesCombatChatCard.getItemFromEvent(options.event);
		
		let card = WumblesCombatChatCard.getCardFromEvent(options.event);
		let hasAttacked = card.data("hasAttacked");
		if (item.hasAttack && getSetting("onlyAttackAdds") && !hasAttacked){
			ui.notifications.warn(game.i18n.localize("WumbleMinkysCombatChatCard.onlyAttackAdds.error"));
			return;
		}
		
		options['options'] = { chatMessage: false };
		console.log(options);
		// get the roll from the default rolling prompt. the options.chatMessage = false prevents it from rendering. The options OBJ needs to be in another object (unlike the attack roll replacement function.
		let roll = await wrapped(options);
		if (!roll)
			return;
		
		let rollHTML = await roll.render();
		rollHTML = WumblesCombatChatCard.addDamageButtons(roll, rollHTML);

		if (item.hasAttack && getSetting("onlyAttackAdds") && hasAttacked && card.find(".wccc-damage-roll:last").children().length > 0){
			await WumblesCombatChatCard.replaceRollOnItemCard(options.event, roll, rollHTML, "wccc-damage-roll");
		}else{
			await WumblesCombatChatCard.addRollToItemCard(options.event, roll, rollHTML, "wccc-damage-roll");
		}
	}
	
	static async replaceSavingThrow(wrapped, abilityId, options){
		if (!getSetting("mergeCard") || !options.hasOwnProperty('speaker'))
			return wrapped(abilityId, options);
		
		options.chatMessage = false;			//prevent the chatMessage from being displayed.
		let roll = await wrapped(abilityId, options);;
		if (!roll)
			return;
		let rollHTML = await roll.render();
		
		await WumblesCombatChatCard.addRollToItemCard(options.event, roll, rollHTML, "wccc-saving-throw");
	}
	
	static async replaceFormulaRoll(wrapped, options){
		if (!getSetting("mergeCard"))
			return wrapped(options);
		
		let roll = await new Roll(this.system.formula, this.getRollData()).roll({async:true});
		if (!roll)
			return;
		let rollHTML = await roll.render();
		
		await WumblesCombatChatCard.addRollToItemCard(options.event, roll, rollHTML, "wccc-other-formula");
	}
	
	//Create a new result in the existing item card
	static async createNewAttackResult(message, currentNumOfResults){
		let userTargets = Array.from(game.user.targets);
		let opts = getProperty(message, `flags.${WumblesCombatChatCard.moduleName}`) ?? {};		//get the current messages' WCF flags or an empty object if there is none
		opts.hasTarget = userTargets.length > 0;
		opts.targets = userTargets;
		opts.number = currentNumOfResults+1;
		let searchString = '<div class="wccc-after-buttons-end">';
		let templateHTML = await renderTemplate(WumblesCombatChatCard.attackResultTemplate, opts);
		let replacementString = `${templateHTML}${searchString}`;
		return message.content.replace(searchString, replacementString);
	}
	
	//Add the roll to the existing Item Card in chat
	static async addRollToItemCard(eventObj, roll, rollHTML, divToAddTo, updateHasAttacked=false){
		if (!roll)
			return;
		
		let [chatMessage, lastAttackResult, lastRoll] = await WumblesCombatChatCard.getChatMessageAndRoll(eventObj, roll, divToAddTo);

		let newChatContent = chatMessage.content;
		
		if (getSetting("onlyAttackAdds") && updateHasAttacked){
			chatMessage.content = newChatContent.replace('data-has-attacked="false"', 'data-has-attacked="true"');
		}
		let jqContent = WumblesCombatChatCard.convertToJQuery(newChatContent);

		if (lastAttackResult.length == 0 || (lastRoll.length > 0 && lastRoll.children().length > 0)){
			newChatContent = await WumblesCombatChatCard.createNewAttackResult(chatMessage, jqContent.find(".wccc-attack-result").length);
			jqContent = WumblesCombatChatCard.convertToJQuery(newChatContent);
			lastRoll = jqContent.find(".wccc-attack-result:last").find(`.${divToAddTo}`);
		}
		if (lastRoll.length > 0 && lastRoll.children().length == 0) {
			let t = $(newChatContent);
			t.find(`.${divToAddTo}:last`).empty();
			t.find(`.${divToAddTo}:last`).append(rollHTML);
			newChatContent = t[0].outerHTML;
		}
		await chatMessage.update({content:newChatContent, rollMode:roll.options.rollMode});
		
		//scroll the new item into view
		$(`[data-message-id="${chatMessage.id}"`).find(".wccc-attack-result:last").find(`.${divToAddTo}`).get(0).scrollIntoView();
	}
	
	static async replaceRollOnItemCard(eventObj, roll, rollHTML, divToAddTo){
		if (!roll)
			return;
		
		let [chatMessage, lastAttackResult, lastRoll] = await WumblesCombatChatCard.getChatMessageAndRoll(eventObj, roll, divToAddTo);
		
		let newChatContent = chatMessage.content;

		if (lastAttackResult.length != 0 && lastRoll.length > 0 && lastRoll.children().length > 0){
			let t = $(newChatContent);
			t.find(".wccc-damage-roll:last").find("div.dice-roll").replaceWith(rollHTML);
			newChatContent = t[0].outerHTML;
		}
		
		await chatMessage.update({content:newChatContent, rollMode:roll.options.rollMode});
	}
	
	static async getChatMessageAndRoll(eventObj, roll, divToAddTo){
		let card = eventObj.target.closest(".chat-card");
		let chatMessage = game.messages.get(card.closest(".message").dataset.messageId);
		
		if (game?.dice3d && game.dice3d?.isEnabled()){
			await game.dice3d.showForRoll(roll, game.user, true, chatMessage.whisper, chatMessage.blind);
		}
		
		let newChatContent = chatMessage.content;
		let jqContent = WumblesCombatChatCard.convertToJQuery(newChatContent);
		let lastAttackResult = jqContent.find(".wccc-attack-result:last");
		let lastRoll = lastAttackResult.find(`.${divToAddTo}`);
		
		return [chatMessage, lastAttackResult, lastRoll];
	}
	
	static convertToJQuery(htmlText){
		return $("<div #wccc-fake/>").html(htmlText).contents();
	}
	
	static getItemFromEvent(event){
		let card = $(event.target).closest(".chat-card");
		return game.actors.get(card.data("actorId")).items.get(card.data("itemId"));		
	}
	
	static getCardFromEvent(event){
		return $(event.target).closest(".chat-card");
	}
	
	static getHasAttacked(card){
		return card.data("hasAttacked");
	}
}

/**************************************************************
	HOOKS!
***************************************************************/
Hooks.on("init", function() {
	WumblesCombatChatCard.init();
	WumblesCombatChatCard.init_hooks();
});