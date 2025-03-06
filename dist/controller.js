var gamepad;
var gamepadButtons = {};
var gamepadAxes = [];
window.addEventListener("gamepadconnected", function (evt) {
    gamepad = navigator.getGamepads()[evt.gamepad.index];
    console.log("Game connected");
});
function scanGamepads() {
    var gamepads = navigator.getGamepads();
    gamepad = gamepads[gamepad.index];
    gamepadAxes = [];
    var tmp = Object.assign([], gamepad.axes);
    while (tmp.length > 1) {
        gamepadAxes.push(tmp.splice(0, 2));
    }
    gamepadButtons = {};
    for (var i = 0; i < gamepad.buttons.length; i++) {
        gamepadButtons[i] = gamepad.buttons[i];
    }
}
