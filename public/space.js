// Experiment with Multi-Camera for multi-window or multi-monitor/multi-machine setups.
// Nikolai Suslov, 2019
//
//  Example Multi-screen grid (x/y)
//  +-----+-----+-----+
//  | 0/0 | 1/0 | 2/0 | ..
//  +-----+-----+-----+
//  | 0/1 | 1/1 | 2/1 | ..
//  +-----+-----+-----+
//    ..    ..    ..
//
// Fork of Croquet Tutorial 4
// 3D Animation
// Croquet Studios, 2019
//


const Q = Croquet.Constants;
Q.NUM_BALLS = 12;            // number of bouncing balls
Q.BALL_RADIUS = 0.25;
Q.CENTER_SPHERE_RADIUS = 2.5;  // a large sphere to bounce off
Q.CENTER_SPHERE_NEUTRAL = 0xaaaaaa; // color of sphere before any bounces
Q.CONTAINER_SIZE = 8;        // edge length of invisible containing cube
Q.STEP_MS = 1000 / 20;       // step time in ms
Q.SPEED = 1.5;               // max speed on a dimension, in units/s

class MyModel extends Croquet.Model {

    init(options) {
        super.init(options);
        this.centerSphereRadius = Q.CENTER_SPHERE_RADIUS;
        this.centerSpherePos = [0, 0, -Q.CONTAINER_SIZE / 2]; // embedded half-way into the back wall
        this.children = [];
        for (let i = 0; i < Q.NUM_BALLS; i++) this.children.push(BallModel.create({ sceneModel: this }));

        this.subscribe(this.id, 'sphere-drag', this.centerSphereDragged); // someone is dragging the center sphere
        this.subscribe(this.id, 'reset', this.resetCenterSphere); // someone has clicked the center sphere

        //Aware of Users
        this.userData = {};
        this.subscribe(this.sessionId, "view-join", this.addUser);
        this.subscribe(this.sessionId, "view-exit", this.deleteUser);
        this.subscribe(this.id, 'onDeleteUser', this.onDeleteUser);
        this.subscribe(this.id, 'checkFullScreenSize', this.checkFullScreenSize);
    }

    centerSphereDragged(pos) {
        this.centerSpherePos = pos;
        this.publish(this.id, 'sphere-pos-changed', pos);
    }

    resetCenterSphere() {
        this.publish(this.id, 'recolor-center-sphere', Q.CENTER_SPHERE_NEUTRAL);
    }

    addUser(id) {
        this.userData[id] = { start: this.now() };
        console.log(`user ${id} came in`);
        this.initCamera(id);
    }

    deleteUser(id) {
        const time = this.now() - this.userData[id].start;
        console.log(`user ${id} left after ${time / 1000} seconds`);
        this.publish(this.id, 'onDeleteUser', id);


        let userCamera = this.getChildById('camera-' + id);
        this.publish(this.id, 'remove-child-from-View', 'camera-' + id);
        this.removeChild(userCamera);

        this.publish(this.id, 'remove-option-from-View');
        this.publish(this.id, 'checkFullScreenSize');

    }

    onDeleteUser(id) {
        if (this.userData[id])
            delete this.userData[id];
    }

    getChildById(id) {
        let child = this.children.filter(el => el.displayName == id)[0];
        return child
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        this.children.splice(index, 1);
        child.destroy();
    }


    initCamera(id) {

        let dataCam = {
            xRatioFullDisplay: 1,
            yRatioFullDisplay: 1,
            xRatioOffset: 0,
            yRatioOffset: 0,
            xDeltaOffset: 0,
            yDeltaOffset: 0,
            displayName: 'camera-' + id
        };

        let camera = CameraModel.create({ sceneModel: this, data: dataCam });
        this.children.push(camera);
        let userCount = Object.entries(this.userData).length;
        this.publish("addCameraGUI", "addCameraGUI", ({ camera: camera, userNum: userCount }));

    }

    checkFullScreenSize() {

        var xRatioFullDisplay = 0;
        var yRatioFullDisplay = 0;

        //find the max ratio of the offset
        this.children.forEach(el => {
            if (el instanceof CameraModel) {
                if (el.xRatioOffset >= xRatioFullDisplay)
                    xRatioFullDisplay = el.xRatioOffset;

                if (el.yRatioOffset >= yRatioFullDisplay)
                    yRatioFullDisplay = el.yRatioOffset;
            }
        })

        let dataCam = {
            xRatioFullDisplay: xRatioFullDisplay + 1,
            yRatioFullDisplay: yRatioFullDisplay + 1
        }

        this.xRatioFullDisplay = dataCam.xRatioFullDisplay;
        this.yRatioFullDisplay = dataCam.yRatioFullDisplay;

        //change on all cameras fullDisplay ratio
        this.children.forEach(el => {
            this.publish(el.id, 'fullDisplay-ratio-changed', dataCam);
        })
    }

}

MyModel.register();

class CameraModel extends Croquet.Model {

    init(options = {}) {
        super.init();
        this.sceneModel = options.sceneModel;
        let initData = options.data;
        let defaultData = {
            xRatioFullDisplay: 1,
            yRatioFullDisplay: 1,
            xRatioOffset: 0,
            yRatioOffset: 0,
            xDeltaOffset: 0,
            yDeltaOffset: 0,
            displayName: 'camera'
        };

        initData ? this.initCamera(initData) : this.initCamera(defaultData);
        this.subscribe(this.sceneModel.id, 'initCamera', this.initCamera);
        this.subscribe(this.displayName, 'changeCameraProps', this.changeCameraProps);

        this.subscribe(this.id, 'fullDisplay-ratio-changed', this.fullDisplayRatioChanged);
        this.subscribe(this.id, 'changeDeltaY', this.deltaOffsetChanged);
        this.subscribe(this.id, 'changeDeltaX', this.deltaOffsetChanged);

    }

    initCamera(data) {
        this.displayName = data.displayName;

        this.xRatioFullDisplay = data.xRatioFullDisplay;
        this.yRatioFullDisplay = data.yRatioFullDisplay;
        this.xRatioOffset = data.xRatioOffset;
        this.yRatioOffset = data.yRatioOffset;
        this.xDeltaOffset = data.xDeltaOffset;
        this.yDeltaOffset = data.yDeltaOffset;
    }

    deltaOffsetChanged(data) {

        if (data.id == 'X') {
            this.xDeltaOffset = data.value;
        } else if (data.id == 'Y') {
            this.yDeltaOffset = data.value;
        }

        this.publish(this.id, 'viewOffset-changed', this);

    }

    fullDisplayRatioChanged(data) {

        this.xRatioFullDisplay = data.xRatioFullDisplay;
        this.yRatioFullDisplay = data.yRatioFullDisplay;
        this.publish(this.id, 'viewOffset-changed', this);

    }

    changeCameraProps(data) {

        console.log('CAMERA CHANGE: ' + data);

        if (data.id == 'X') {
            this.xRatioOffset = data.value;
        } else if (data.id == 'Y') {
            this.yRatioOffset = data.value;
        }

        this.publish(this.sceneModel.id, 'checkFullScreenSize');

    }
}

CameraModel.register();

class CameraView extends Croquet.View {

    constructor(model) {
        super(model);

        this.displayName = model.displayName;
        this.width = window.innerWidth * window.devicePixelRatio;
        this.height = window.innerHeight * window.devicePixelRatio;

        this.object3D = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 10000);
        this.object3D.position.set(0, 0, 4);
        this.setViewOffset(model);
        this.subscribe(model.id, { event: 'viewOffset-changed', handling: 'oncePerFrame' }, this.setViewOffset);
        this.subscribe(this.id, { event: 'beActiveCamera', handling: 'oncePerFrame' }, this.setActiveCamera);
        this.subscribe(this.displayName, { event: 'beActiveCamera', handling: 'oncePerFrame' }, this.setActiveCamera);
    }

    setViewOffset(data) {

        this.width = window.innerWidth * window.devicePixelRatio;
        this.height = window.innerHeight * window.devicePixelRatio;

        this.fullWidth = this.width * data.xRatioFullDisplay;
        this.fullHeight = this.height * data.yRatioFullDisplay;
        let xoffset = (this.width * data.xRatioOffset) + data.xDeltaOffset;
        let yoffset = (this.height * data.yRatioOffset) + data.yDeltaOffset;

        this.object3D.setViewOffset(
            this.fullWidth,
            this.fullHeight,
            xoffset,
            yoffset,
            this.width,
            this.height);

        this.publish('resizeWindow', 'resizeWindow', { w: this.fullWidth, h: this.fullHeight });
    }

    setActiveCamera() {
        console.log("SET ACTVIE CAMERA: " + this.id);
        this.publish('setActiveCamera', 'setActiveCamera', this.object3D);
        this.publish('resizeWindow', 'resizeWindow', { w: this.fullWidth, h: this.fullHeight });
    }

}


class BallModel extends Croquet.Model {

    init(options = {}) {
        super.init();
        this.sceneModel = options.sceneModel;

        const rand = range => Math.floor(range * Math.random()); // integer random less than range
        this.radius = Q.BALL_RADIUS;
        this.color = `hsl(${rand(360)},${rand(50) + 50}%,50%)`;
        this.resetPosAndSpeed();

        this.subscribe(this.sceneModel.id, 'reset', this.resetPosAndSpeed); // the reset event will be sent using the model id as scope

        this.future(Q.STEP_MS).step();
    }

    // a ball resets itself by positioning at the center of the center-sphere
    // and giving itself a randomized velocity
    resetPosAndSpeed() {
        const srand = range => range * 2 * (Math.random() - 0.5); // float random between -range and +range
        this.pos = this.sceneModel.centerSpherePos.slice();
        const speedRange = Q.SPEED * Q.STEP_MS / 1000; // max speed per step
        this.speed = [srand(speedRange), srand(speedRange), srand(speedRange)];
    }

    step() {
        this.moveBounce();
        this.future(Q.STEP_MS).step(); // arrange to step again
    }

    moveBounce() {
        this.bounceOffContainer();
        this.bounceOffCenterSphere();
        const pos = this.pos;
        const speed = this.speed;
        this.moveTo([pos[0] + speed[0], pos[1] + speed[1], pos[2] + speed[2]]);
    }

    bounceOffCenterSphere() {
        const pos = this.pos;
        const spherePos = this.sceneModel.centerSpherePos; // a model is allowed to read state of another model
        const distFromCenter = posArray => {
            let sq = 0;
            posArray.forEach((p, i) => {
                const diff = spherePos[i] - p;
                sq += diff * diff;
            });
            return Math.sqrt(sq);
        };
        const speed = this.speed;
        const threshold = Q.CENTER_SPHERE_RADIUS + this.radius;
        const distBefore = distFromCenter(pos);
        const distAfter = distFromCenter([pos[0] + speed[0], pos[1] + speed[1], pos[2] + speed[2]]);
        if (distBefore >= threshold && distAfter < threshold) {
            const unitToCenter = pos.map((p, i) => (spherePos[i] - p) / distBefore);
            const speedAcrossBoundary = speed[0] * unitToCenter[0] + speed[1] * unitToCenter[1] + speed[2] * unitToCenter[2];
            this.speed = this.speed.map((v, i) => v - 2 * speedAcrossBoundary * unitToCenter[i]);
            this.publish(this.sceneModel.id, 'recolor-center-sphere', this.color);
        }
    }

    bounceOffContainer() {
        const pos = this.pos;
        const speed = this.speed;
        pos.forEach((p, i) => {
            if (Math.abs(p) > Q.CONTAINER_SIZE / 2 - this.radius) speed[i] = Math.abs(speed[i]) * -Math.sign(p);
        });
    }

    // the ball moves by recording its new position, then publishing that 
    // position in an event that its view is expected to have subscribed to
    moveTo(pos) {
        this.pos = pos;
        this.publish(this.id, 'pos-changed', this.pos);
    }
}

BallModel.register();

// one-time function to set up Three.js, with a simple lit scene
function setUpScene() {
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(50, 50, 50);
    scene.add(light);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.displayName = 'default';
    console.log(camera.displayName);

    camera.position.set(0, 0, 4);
    const threeCanvas = document.getElementById("three");
    const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas });
    renderer.setClearColor(0xaa4444);


    // utility objects for managing pointer interaction
    const raycaster = new THREE.Raycaster();
    let dragObject = null;
    let dragged;
    const dragOffset = new THREE.Vector3();
    const dragPlane = new THREE.Plane();
    const mouse = new THREE.Vector2();
    const THROTTLE_MS = 1000 / 20; // minimum delay between pointer-move events that we'll handle
    let lastTime = 0;
    function setMouse(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    function onPointerDown(event) {
        event.preventDefault();
        setMouse(event); // convert from window coords to relative (-1 to +1 on each of x, y)
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);
        for (let i = 0; i < intersects.length && !dragObject; i++) {
            const intersect = intersects[i];
            const threeObj = intersect.object;
            if (threeObj.q_draggable) { // a flag that we set on just the central sphere
                dragObject = threeObj;
                dragged = false; // so we can detect a non-dragging click
                dragOffset.subVectors(dragObject.position, intersect.point); // position relative to pointer
                // set up for drag in vertical plane perpendicular to camera direction
                dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), intersect.point);
            }
        }
    }
    threeCanvas.addEventListener('pointerdown', onPointerDown);

    function onPointerMove(event) {
        event.preventDefault();

        // ignore if there is no drag happening
        if (!dragObject) return;

        // ignore if the event is too soon after the last one 
        if (event.timeStamp - lastTime < THROTTLE_MS) return;
        lastTime = event.timeStamp;

        const lastMouse = { ...mouse };
        setMouse(event);
        // ignore if the event is too close on the screen to the last one
        if (Math.abs(mouse.x - lastMouse.x) < 0.01 && Math.abs(mouse.y - lastMouse.y) < 0.01) return;

        raycaster.setFromCamera(mouse, camera);
        const dragPoint = raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3());
        dragObject.q_onDrag(new THREE.Vector3().addVectors(dragPoint, dragOffset));
        dragged = true; // a drag has happened (so don't treat the pointerup as a click)
    }
    threeCanvas.addEventListener('pointermove', onPointerMove);

    function onPointerUp(event) {
        event.preventDefault();
        if (dragObject) {
            if (!dragged && dragObject.q_onClick) dragObject.q_onClick();
            dragObject = null;
        }
    }
    threeCanvas.addEventListener('pointerup', onPointerUp);


    function onWindowResizeEvent(event) {
        scene.onWindowResizeEvent();
    }
    window.addEventListener('resize', onWindowResizeEvent, false);


    /// GUI Elements ///
    //mdc.select.MDCSelect.attachTo(document.querySelector('.mdc-select'));

    const select = new mdc.select.MDCSelect(document.getElementById('positionX'));
    select.listen('MDCSelect:change', () => {
        onChangeXEvent({ id: 'X', index: select.selectedIndex, value: Number.parseInt(select.value) })
    });

    const select2 = new mdc.select.MDCSelect(document.getElementById('positionY'));
    select2.listen('MDCSelect:change', () => {
        onChangeYEvent({ id: 'Y', index: select2.selectedIndex, value: Number.parseInt(select2.value) })
    });


    function onChangeXEvent(data) {
        scene.onChangeXEvent(data);
    }

    function onChangeYEvent(data) {
        scene.onChangeYEvent(data);
    }

    let yDeltaSliderEl = document.querySelector('#discrete-mdc-sliderY');
    var yDeltaSlider = new mdc.slider.MDCSlider(yDeltaSliderEl);

    yDeltaSlider.listen('MDCSlider:input', function (e) {
        onChangeYDelta({ value: yDeltaSlider.value });
    }, false);

    yDeltaSlider.listen('MDCSlider:change', function (e) {
        onChangeYDelta({ value: yDeltaSlider.value });
    }, false)


    function onChangeYDelta(data) {
        scene.onChangeYDelta(data);
    }


    let xDeltaSliderEl = document.querySelector('#discrete-mdc-sliderX');
    var xDeltaSlider = new mdc.slider.MDCSlider(xDeltaSliderEl);


    xDeltaSlider.listen('MDCSlider:input', function (e) {
        onChangeXDelta({ value: xDeltaSlider.value });
    }, false);

    xDeltaSlider.listen('MDCSlider:change', function (e) {
        onChangeXDelta({ value: xDeltaSlider.value });
    }, false)


    function onChangeXDelta(data) {
        scene.onChangeXDelta(data);
    }


    ////
    // function that the app must invoke when ready to render the scene 
    // on each animation frame.
    function sceneRender(cam) {
        renderer.render(scene, cam)
    }

    return { scene, sceneRender, camera, renderer };
}

class MyView extends Croquet.View {

    constructor(model) {
        super(model);
        this.sceneModel = model;
        const sceneSpec = setUpScene(); // { scene, sceneRender }
        this.scene = sceneSpec.scene;
        this.sceneRender = sceneSpec.sceneRender;
        this.activeCamera = sceneSpec.camera;
        this.defaultCamera = sceneSpec.camera;
        this.renderer = sceneSpec.renderer;

        this.centerSphere = new THREE.Mesh(
            new THREE.SphereGeometry(model.centerSphereRadius, 16, 16),
            new THREE.MeshStandardMaterial({ color: Q.CENTER_SPHERE_NEUTRAL, roughness: 0.7 }));
        this.centerSphere.position.fromArray(model.centerSpherePos);
        this.scene.add(this.centerSphere);
        // set Croquet app-specific properties for handling events
        this.centerSphere.q_onClick = () => this.publish(model.id, 'reset');
        this.centerSphere.q_draggable = true;
        this.centerSphere.q_onDrag = posVector => this.posFromSphereDrag(posVector.toArray());
        this.subscribe(model.id, 'sphere-pos-changed', this.moveSphere);
        this.subscribe(model.id, 'recolor-center-sphere', this.recolorSphere);


        this.children = [];

        this.scene.onWindowResizeEvent = () => this.publish('resizeWindow', 'resizeWindow');
        this.subscribe('resizeWindow', 'resizeWindow', this.onWindowResize);
        this.onWindowResize();

        this.scene.onChangeXEvent = (data) => {
            this.publish('camera-' + this.viewId, 'changeCameraProps', data);
            this.publish('camera-' + this.viewId, 'beActiveCamera');
        }

        this.scene.onChangeYEvent = (data) => {
            this.publish('camera-' + this.viewId, 'changeCameraProps', data);
            this.publish('camera-' + this.viewId, 'beActiveCamera');
        }

        console.log(this.viewId);
        console.log(model.users);

        this.subscribe('setActiveCamera', 'setActiveCamera', this.setActiveCamera);
        this.subscribe('addCameraGUI', 'addCameraGUI', this.addCameraGUI);
        this.subscribe(model.id, 'remove-child-from-View', this.removeChild);
        this.subscribe(model.id, 'remove-option-from-View', this.removeOption);

        model.children.forEach(childModel => {
            if (childModel instanceof CameraModel) {
                // let overlay = document.getElementById('overlay');
                // let el = document.createElement("div");
                // el.setAttribute("id", childModel.id);
                // el.classList.add('gui_button'); 
                // el.innerHTML = childModel.displayName;
                // overlay.appendChild(el);

                // let childView = new CameraView(childModel);
                // el.addEventListener("click", event => this.onclick(event, { id: childView.id}), false);
                // this.scene.add(childView.object3D);
            } else {
                this.attachChild(childModel)
            }

        });


        ///GUI///
        let overlay = document.getElementById('gui');

        let el = document.createElement("div");
        el.classList.add('gui_button');
        el.innerHTML = 'Default camera';
        el.addEventListener("click", event => {
            this.activeCamera = this.defaultCamera;
            this.onWindowResize();
        }, false);
        overlay.appendChild(el);
    }

    addCameraGUI(data) {

        let childModel = data.camera;
        let overlay = document.getElementById('gui');

        if (childModel.displayName == 'camera-' + this.viewId) {

            let el = document.createElement("div");
            el.setAttribute("id", childModel.id);
            el.classList.add('gui_button');
            el.innerHTML = 'Multi camera'; // + childModel.displayName;
            el.addEventListener("click", event => this.onclick(event, { id: childView.id }), false);
            overlay.appendChild(el);

            this.scene.onChangeYDelta = (data) => {
                let dt = { id: 'Y', for: 'camera-' + this.viewId, value: data.value };
                this.publish(childModel.id, 'changeDeltaY', dt);
            }

            this.scene.onChangeXDelta = (data) => {
                let dt = { id: 'X', for: 'camera-' + this.viewId, value: data.value };
                this.publish(childModel.id, 'changeDeltaX', dt);
            }
        }


        let childView = new CameraView(childModel);
        this.children.push(childView);
        this.scene.add(childView.object3D);


        let select = document.getElementById('positionX').getElementsByClassName("mdc-list")[0];
        let optX = document.createElement('li');//document.createElement('option');
        optX.setAttribute("class", "mdc-list-item");
        optX.setAttribute("data-value", data.userNum - 1);
        optX.innerHTML = data.userNum - 1;
        //optX.value = data.userNum - 1;
        select.appendChild(optX);
        //const selectElX = new mdc.select.MDCSelect(document.getElementById('positionX'));

        let select2 = document.getElementById('positionY').getElementsByClassName("mdc-list")[0];
        let optY = document.createElement('li');
        optY.setAttribute("class", "mdc-list-item");
        optY.setAttribute("data-value", data.userNum - 1);
        optY.innerHTML = data.userNum - 1;
        select2.appendChild(optY);
        //const selectElY = new mdc.select.MDCSelect(document.getElementById('positionY'));

    }


    removeChild(id) {
        let child = this.children.filter(el => el.displayName == id)[0];
        if (child) {
            const index = this.children.indexOf(child);
            this.children.splice(index, 1);
            child.detach()
        }
    }

    removeItemsFromList(listName) {
        let select = document.getElementById(listName).getElementsByClassName("mdc-list")[0];
        var options = select.getElementsByTagName("li");
        if (options.length > 0)
            options[options.length - 1].remove();
    }

    removeOption() {

        this.removeItemsFromList('positionX');
        this.removeItemsFromList('positionY');

    }


    onWindowResize(data) {
        if (this.activeCamera.displayName == 'default') {
            this.activeCamera.aspect = window.innerWidth / window.innerHeight;
        } else if (data) {
            this.activeCamera.aspect = data.w / data.h;
        }
        // else {
        //     let xRatio = this.sceneModel.xRatioFullDisplay;
        //     let yRatio = this.sceneModel.yRatioFullDisplay;
        //     if (xRatio && yRatio) {
        //         this.activeCamera.aspect = window.innerWidth*xRatio / window.innerHeight*yRatio;
        //     } 
        // }

        this.activeCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onclick(e, data) {
        this.publish(data.id, "beActiveCamera");
        //this.onWindowResize();
    }

    setActiveCamera(cam) {
        this.activeCamera = cam;
    }

    posFromSphereDrag(pos) {
        const limit = Q.CONTAINER_SIZE / 2;
        // constrain x and y to container (z isn't expected to be changing)
        [0, 1].forEach(i => { if (Math.abs(pos[i]) > limit) pos[i] = limit * Math.sign(pos[i]); });
        this.publish(this.sceneModel.id, 'sphere-drag', pos);
    }

    moveSphere(pos) {
        // this method just moves the view of the sphere
        this.centerSphere.position.fromArray(pos);
    }

    recolorSphere(color) {
        this.centerSphere.material.color.copy(new THREE.Color(color));
    }

    attachChild(childModel) {
        this.scene.add(new BallView(childModel).object3D);
    }

    update(time) {
        this.sceneRender(this.activeCamera);
    }
}

class BallView extends Croquet.View {

    constructor(model) {
        super(model);
        this.object3D = new THREE.Mesh(
            new THREE.SphereGeometry(model.radius, 12, 12),
            new THREE.MeshStandardMaterial({ color: model.color })
        );
        this.move(model.pos);
        this.subscribe(model.id, { event: 'pos-changed', handling: 'oncePerFrame' }, this.move);
    }

    move(pos) {
        this.object3D.position.fromArray(pos);
    }
}

Croquet.startSession("3D Animation and multi-camera", MyModel, MyView);