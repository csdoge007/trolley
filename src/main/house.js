import * as dat from "dat.gui"
import * as THREE from 'three';
import { MeshToonMaterial, PerspectiveCamera, Vector2 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
let scene, renderer, camera, labelRenderer
let buildingPositions = []
const SCWIDTH = 1000, SCHEIGHT = 1000, blockWidth = 50, blockHeight = 50
const mp = new Array(20).fill(0).map(() => new Array(20).fill(false)) // false表示非道路
let building_positions
let trolley, wheelMeshes
let statusText,controllerText
const carPosition = new Vector2() // 小车坐标
let troPosition,endPosition // 小车位置
let arrowMesh // 表示箭头
let nowCurve // 表示目前道路的曲线
let ismove = false;// 表示小车目前是否在移动
let lasttime = 0     // 表示上一次刷新时候的时间
let movetime = 0     // 此次任务的时间
let vmove = 0        // 移动的速度   
let enCamera,troCamera
main()
function main() {
    scene = createScene()
    renderer = createRenderer()
    camera = createCamera()
    const light = createLight()
    const ground = createGround()
    const stBuilding = createStBuilding()
    createRoad()
    createBuildings(stBuilding)
    initLabelRenderer()
    const control = createControl()
    setTrolley()
    createGui()
    requestAnimationFrame(render)
}
// 初始化标签渲染器
function initLabelRenderer() {
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth - 201, window.innerHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    document.getElementById("c").appendChild(labelRenderer.domElement);
}
// 创建场景
function createScene() {
    const scene = new THREE.Scene()
    return scene
}
// 创建渲染器
function createRenderer() {
    const renderer = new THREE.WebGLRenderer()
    renderer.setSize(window.innerWidth, window.innerHeight);
    let c = document.getElementById('c')
    c.appendChild(renderer.domElement);
    renderer.setClearColor(0xaaaaaa)    // 设置背景色
    renderer.shadowMap.enabled = true   // 开启投影
    return renderer
}
// 创建相机
function createCamera() {
    enCamera = makeCamera()
    enCamera.position.set(SCWIDTH, SCWIDTH, SCWIDTH)
    enCamera.lookAt(0, 0, 0)
    return enCamera
}
// 设置相机
function makeCamera(fov = 40) {
    const aspect = 2
    const zNear = 0.1
    const zFar = 5000
    return new PerspectiveCamera(fov, aspect, zNear, zFar)
}
// 设置光照
function createLight() {
    // 设置主光
    const light = new THREE.DirectionalLight(0xffffff, 1) // 平行光 / 正交光
    light.position.set(20, 20, 20)
    scene.add(light)
    light.castShadow = true // 允许呈现阴影
    light.shadow.mapSize.width = 2048   // 设置阴影的分辨率
    light.shadow.mapSize.height = 2048
    const d = 50
    // 设置主光的视域
    light.shadow.camera.left = -d
    light.shadow.camera.right = d
    light.shadow.camera.top = d
    light.shadow.camera.bottom = -d
    light.shadow.camera.near = 1
    light.shadow.camera.far = 50
    // 设置辅助光(不投影)
    {
        const light = new THREE.DirectionalLight(0xffffff, 1)
        light.position.set(1, 2, 4)
        scene.add(light)
    }
}
// 创建地面
function createGround() {
    const textureGeometry = new THREE.PlaneGeometry(SCWIDTH, SCHEIGHT)
    const textureMesh = new THREE.Mesh(textureGeometry, new THREE.MeshBasicMaterial())
    createTexture('./img/grass.jpg', (texture) => {
        textureMesh.material.map = texture;
        textureMesh.rotation.x = -0.5 * Math.PI;
        textureMesh.receiveShadow = true
        scene.add(textureMesh)
    })
}
// 创建标准建筑物
function createStBuilding() {
    let geometry = new THREE.BoxGeometry(50, 50, 50);
    let material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
    });
    let cube = new THREE.Mesh(geometry, material);
    return cube
}
// 创建建筑群落
function createBuildings(cube) {
    building_positions = [
        [6, 2],
        [5, 7],
        [8, 5],
        [2, 7],
        [3, 8],
        [6, 5],
        [1, 1],
        [10, 6],
        [16, 2],
        [16, 4],
        [18, 2],
        [11, 8],
        [15, 8],
        [8, 11],
        [8, 13],
        [11, 13],
        [13, 11],
        [14, 13],
        [14, 16],
        [13, 18],
        [18, 10],
        [18, 14],
        [18, 16]
    ]
    let c = document.getElementById('c')
    c.appendChild(renderer.domElement)
    for (let i = 0; i < building_positions.length; i++) {
        let cloneCube = cube.clone()
        let worldPosition = getWorldPosition(building_positions[i][0], building_positions[i][1])
        let x = worldPosition.x
        let z = worldPosition.z
        buildingPositions.push([x, z])
        let height = Math.floor(Math.random() * 201) + 100
        // let height = 50
        cloneCube.scale.set(1, height / 50, 1)
        cloneCube.position.set(x, height / 2, z)
        const vertexShaderReplacements = `
        precision highp float;
        varying vec4 fPosition;
        void main() {
            fPosition = modelMatrix * vec4(position,1.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
        `
        const fragmentShaderReplacements = `
        precision highp float;
        varying vec4 fPosition;
        uniform float interval;
        void main() {
            float indexMix = mix(0.0,1.0,fPosition.y / interval);
            gl_FragColor =  vec4(indexMix * vec3(0.0,0.0,1.0),1.0);
        }
        `
        let uniforms = {
            interval: {
                type: "f",
                value: Number(height)
            }
        }
        const cubeMaterial = new THREE.ShaderMaterial({
            // side: THREE.DoubleSide,
            uniforms: uniforms,
            vertexShader: vertexShaderReplacements,
            fragmentShader: fragmentShaderReplacements
        })
        cloneCube.material = cubeMaterial

        let mark = document.createElement('div')
        mark.className = "building"
        c.appendChild(mark)
        let name = document.createElement('div')
        name.className = "name"
        name.innerHTML = i + 1 + "号房子"
        mark.appendChild(name)
        const marktag = new CSS2DObject(mark)
        marktag.position.set(x, height + 10, z)
        marktag.scale.set(0.5, 0.5, 0.5)
        scene.add(marktag)
        scene.add(cloneCube)
    }
}
// 转换为实际坐标
function getWorldPosition(x, z) {
    return {
        x: (-SCWIDTH / 2) + x * blockWidth,
        z: (-SCHEIGHT / 2) + z * blockHeight
    }
}
// 创建照相机控制器
function createControl() {
    let control = new OrbitControls(camera, labelRenderer.domElement);
    control.enableRotate = true; //启用旋转
    control.enablePan = true; //启用平移
    control.enableZoom = true;//启用缩放
    return control
}
// 渲染函数
function render(time) {
    time *= 0.001
    if (!ismove) {
        if (arrowMesh) {
            scene.remove(arrowMesh)
            arrowMesh.geometry.dispose()
            arrowMesh.material.dispose()
        }
    } else {
        movetime += (time - lasttime)
        let len = nowCurve.getLength()
        if (movetime * vmove < len) {
            nowCurve.getPointAt(movetime * vmove / len, carPosition)
            let frontp = new Vector2()
            nowCurve.getPointAt(Math.min(1.0,movetime * vmove * 2 / len),frontp)
            // 设置小车朝向
            trolley.lookAt(carPosition.x, 5, carPosition.y)
            // 设置小车位置
            trolley.position.set(carPosition.x, 5, carPosition.y)
            // 车轱辘的转动
            wheelMeshes.forEach(obj => {
                obj.rotation.x = time * 3
            })
        } else {
            ismove = false
            statusText.setValue('小车空闲中')
            troPosition = endPosition
            controllerText.setValue(troPosition + '号房子')
        }
    }
    lasttime = time
    renderer.render(scene, camera)
    labelRenderer.render(scene, camera)
    requestAnimationFrame(render)
}
// 创建道路贴图
function createRoad() {
    setRoad()
    createTexture('./img/road.png', (texture) => {
        for (let i = 1; i < 20; i++) {
            for (let j = 1; j < 20; j++) {
                if (mp[i][j]) {
                    let worldPosition = getWorldPosition(i, j)
                    let x = worldPosition.x
                    let z = worldPosition.z
                    const textureGeometry = new THREE.PlaneGeometry(blockWidth, blockHeight)
                    const textureMesh = new THREE.Mesh(textureGeometry, new THREE.MeshBasicMaterial({ map: texture }))
                    textureMesh.rotation.x = -0.5 * Math.PI;
                    textureMesh.receiveShadow = true
                    textureMesh.position.set(x, 5, z)
                    scene.add(textureMesh)
                }
            }
        }
    })
}
// 封装加载贴图
function createTexture(url, func) {
    const loader = new THREE.TextureLoader()
    loader.load(url, function (texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(100, 100);
        func(texture)
    })
}
// 规划道路
function setRoad() {
    for (let i = 2; i <= 7; i++) mp[i][1] = true
    for (let i = 2; i <= 6; i++) mp[1][i] = true
    for (let i = 2; i <= 6; i++) mp[7][i] = true
    for (let i = 2; i <= 4; i++) mp[i][6] = true
    for (let i = 7; i <= 9; i++) mp[4][i] = true
    for (let i = 6; i <= 16; i++) mp[i][7] = true
    for (let i = 1; i <= 19; i++) mp[17][i] = true
    for (let i = 5; i <= 9; i++) mp[i][9] = true
    for (let i = 10; i <= 19; i++) mp[9][i] = true
    for (let i = 10; i <= 16; i++) mp[i][19] = true
    for (let i = 10; i <= 18; i++) {
        mp[12][i] = true
        mp[15][i] = true
    }
    for (let i = 13; i <= 14; i++) {
        mp[i][10] = true
    }
}
// 绘制小车
function createTrolley() {
    const car = new THREE.Group()
    const sideLength = 8
    const bodyGeometry = new THREE.BoxGeometry(sideLength, sideLength, sideLength); // 绘制立方体
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x6688aa })
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
    bodyMesh.castShadow = true // 允许投射阴影
    bodyMesh.position.y = sideLength / 2
    car.add(bodyMesh)
    const wheelRadius = 3 // 轮胎圆柱体的半径
    const wheelThickness = 1.8 // 轮胎的厚度
    const wheelSegments = 20  // 分划
    const wheelGeometry = new THREE.CylinderGeometry(
        wheelRadius,
        wheelRadius,
        wheelThickness,
        wheelSegments
    )
    const wheelMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888
    })
    const cx = sideLength / 2 + wheelThickness / 2   // 设置两个轮胎所处的位置
    wheelMeshes = [-cx, cx].map(x => {
        const mesh = new THREE.Mesh(wheelGeometry, wheelMaterial)
        mesh.rotation.z = Math.PI * 0.5     // 将轮胎立起来
        mesh.position.set(x, wheelRadius, 0)
        mesh.castShadow = true
        car.add(mesh)
        return mesh
    })
    troCamera = makeCamera()
    car.add(troCamera)
    troCamera.position.y = 20
    troCamera.position.z = -10
    troCamera.lookAt(0,20,0)
    scene.add(car)
    return car
}
// 设置小车
function setTrolley() {
    trolley = createTrolley()
    // ismove = true
    // vmove = 40
    troPosition = 14 // 小车初始位于14号房子
    let stxy = getWorldPosition(9, 11)
    trolley.position.set(stxy.x, 5, stxy.z)
    carPosition.x = stxy.x
    carPosition.y = stxy.z
}
// bfs， 从(dx,dy) -> (tx,ty)
function bfs(dx, dy, tx, ty) {
    if (!mp[dx][dy] || !mp[tx][ty]) return null
    let q = []
    let pre = new Array(25).fill(0).map(() => new Array(25).fill(0))
    let vis = new Array(25).fill(0).map(() => new Array(25).fill(false))
    let road = [[-1, 0], [0, 1], [1, 0], [0, -1]]
    vis[dx][dy] = true
    q.push({ x: dx, y: dy, step: 0 })
    while (q.length > 0) {
        let t = q.shift()
        if (t.x == tx && t.y == ty) break
        for (let i = 0; i < 4; i++) {
            let kx = t.x + road[i][0]
            let ky = t.y + road[i][1]
            if (mp[kx][ky] && !vis[kx][ky]) {
                vis[kx][ky] = true
                q.push({ x: kx, y: ky, step: t.step + 1 })
                pre[kx][ky] = { x: t.x, y: t.y }
            }
        }
    }
    let resQueue = []
    let p = { x: tx, y: ty }
    while (p != 0) {
        resQueue.push(p)
        p = pre[p.x][p.y]
    }
    let points = []
    while (resQueue.length > 0) {
        let resPoint = resQueue.pop()
        let worldPosition = getWorldPosition(resPoint.x, resPoint.y)
        let ax = worldPosition.x
        let az = worldPosition.z
        points.push(new THREE.Vector2(ax, az))
    }
    const curve = new THREE.SplineCurve(points)
    getArrowLine(curve)
    ismove = true
    movetime = 0
    nowCurve = curve
    statusText.setValue('小车正忙')
}
// 绘制箭头
function getArrowLine(curve) {
    const vertexShader = `
    attribute vec3 position;
    uniform mat4 projectionMatrix;
    uniform mat4 viewMatrix;
    uniform mat4 modelMatrix;
    void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    }
    `;
    const fragmentShader = `
    void main() {
      gl_FragColor = vec4(1.0,1.0,0.0,1.0);
    }
`;
    const numPoints = Math.floor(curve.getLength() / 15)
    const points = curve.getPoints(numPoints)  // 生成点集

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 1; i < points.length; i++) {
        let directionVector = new THREE.Vector2(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y).normalize()
        let dx = directionVector.x * 5
        let dy = directionVector.y * 5
        let x0 = points[i].x
        let y0 = points[i].y
        let x1 = x0 - dx
        let y1 = y0 - dy
        let v1 = new THREE.Vector3(dx, 0, dy)
        let v2 = new THREE.Vector3(0, 1, 0)
        let perpendicular = new THREE.Vector3().crossVectors(v1, v2).normalize()
        let x3 = x1 - dx + perpendicular.x * 5
        let y3 = y1 - dy + perpendicular.z * 5
        let x2 = x3 - perpendicular.x * 2 * 5
        let y2 = y3 - perpendicular.z * 2 * 5
        vertices.push(x0, 0.0, y0)
        vertices.push(x2, 0.0, y2)
        vertices.push(x1, 0.0, y1)
        vertices.push(x0, 0.0, y0)
        vertices.push(x1, 0.0, y1)
        vertices.push(x3, 0.0, y3)
    }
    // itemSize = 3 因为每个顶点都是一个三元组。
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    const material = new THREE.RawShaderMaterial({
        vertexShader,
        fragmentShader
    })
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 10
    arrowMesh = mesh
    scene.add(mesh)
}
// gui面板设计
function createGui() {
    const gui = new dat.GUI()
    let target = -1
    const obj = {
        Position: 14,
        text: troPosition + '号房子',
        status: '小车空闲中',
        speed: 1,
        camera: '高空相机',
        onClickButton: function () {
            if (target != -1) {
                if (this.status == '小车正忙' || target == troPosition || this.speed == 0 || target == -1) return
                else {
                    let d = getRoadPosition(
                        building_positions[troPosition - 1][0],
                        building_positions[troPosition - 1][1]
                    )
                    let t = getRoadPosition(
                        building_positions[target - 1][0],
                        building_positions[target - 1][1]
                    )
                    bfs(d.x,d.y,t.x,t.y)
                    endPosition = target
                }
            } else alert('请重新选择目的地')
        }
    };
    controllerText = gui.add(obj, 'text').name('小车所在位置')
    statusText = gui.add(obj, 'status').name('小车的状态')
    let buildings = []
    for (let i = 0; i < building_positions.length; i++) {
        buildings.push(i + 1 + '号房子')
    }
    let speeds = []
    for (let i = 1; i <= 10; i++) {
        speeds.push(i * 5 + 'm/s')
    }
    gui.add(obj, 'Position', buildings).name('终点').onChange(function (value) {
        let index = value.indexOf('号')
        let num = parseInt(value.slice(0, index))
        target = num
    });
    gui.add(obj, 'speed', speeds).name('小车速度').onChange(function (value) {
        if(obj.status == '小车正忙') {
            alert('小车正在行驶，请不要随意更改速度')
            return 
        }
        let index = value.indexOf('m')
        let num = parseInt(value.slice(0, index))
        vmove = num
    })
    gui.add(obj,'camera',['高空视角','小车视角']).name('视角切换').onChange(function (value) {
        if(value == '小车视角') {
            camera = troCamera
        } else camera = enCamera
    })
    gui.add(obj, 'onClickButton').name('\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0开始配送');
}
// 获取该坐标附近最近的道路坐标
function getRoadPosition(x, y) {
    let road = [0, -1, 0, 1]
    for (let i = 0; i < 4; i++) {
        let dx = road[i] + x
        let dy = road[(i + 1) % 4] + y
        if (dx >= 1 && dx <= 19 && dy >= 1 && dy <= 19 && mp[dx][dy]) {
            return {x: dx,y: dy}
        }
    }
}