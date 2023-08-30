
export const registerSettings = function () {
	
	const debouncedReload = foundry.utils.debounce(function () { window.location.reload(); }, 500);
	
	game.settings.register("wumbles-combat-chat-cards", "mergeCard", {
		name: game.i18n.localize("WumbleMinkysCombatChatCard.mergeCard.name"),
		hint: game.i18n.localize("WumbleMinkysCombatChatCard.mergeCard.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});
	
}