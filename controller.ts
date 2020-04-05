let gamepad;
const gamepadButtons = {};
let gamepadAxes = [];

window.addEventListener("gamepadconnected", (evt: GamepadEvent) => {
	gamepad = navigator.getGamepads()[evt.gamepad.index];
	console.log("Game connected");
});

function scanGamepads() {
	let gamepads = navigator.getGamepads();
	gamepad = gamepads[gamepad.index];

	gamepadAxes = [];
	let tmp = Object.assign([], gamepad.axes);
	while(tmp.length > 1) {
		gamepadAxes.push(tmp.splice(0, 2));
	}

}