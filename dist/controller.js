let gamepad;
let gamepadButtons = {};
let gamepadAxes = [];
window.addEventListener("gamepadconnected", (evt) => {
    gamepad = navigator.getGamepads()[evt.gamepad.index];
    console.log("Game connected");
});
function scanGamepads() {
    let gamepads = navigator.getGamepads();
    gamepad = gamepads[gamepad.index];
    gamepadAxes = [];
    let tmp = Object.assign([], gamepad.axes);
    while (tmp.length > 1) {
        gamepadAxes.push(tmp.splice(0, 2));
    }
    gamepadButtons = {};
    for (let i = 0; i < gamepad.buttons.length; i++) {
        gamepadButtons[i] = gamepad.buttons[i];
    }
}
//# sourceMappingURL=controller.js.map