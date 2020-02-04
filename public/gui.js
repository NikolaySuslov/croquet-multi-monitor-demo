const fullScreenToggle = document.querySelector('#fullscreenui');
const compfullScreen = new mdc.iconButton.MDCIconButtonToggle(fullScreenToggle);
fullScreenToggle.addEventListener('MDCIconButtonToggle:change', (e) => {

    if (screenfull.enabled) {
        screenfull.toggle();
    } else {
        // Ignore or do something else
    }
});

const iconEl = document.querySelector('#hideui');
const compHideUI = new mdc.iconButton.MDCIconButtonToggle(iconEl);
iconEl.addEventListener('MDCIconButtonToggle:change', (e) => {

    let ui = document.getElementById('gui');
    if (ui) {

        let chkAttr = e.detail.isOn;
        if (chkAttr) {
            ui.style.visibility = 'hidden'
        } else {
            ui.style.visibility = 'visible'
        }
    }
});
