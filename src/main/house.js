import * as THREE from 'three';
import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
let scene, renderer, camera, labelRenderer
let buildingPositions = []
const SCWIDTH = 1000, SCHEIGHT = 1000, blockWidth = 50, blockHeight = 50
const mp = new Array(20).fill(0).map(() => new Array(20).fill(false)) // false表示非道路
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
    const camera = makeCamera()
    camera.position.set(SCWIDTH, SCWIDTH, SCWIDTH)
    camera.lookAt(0, 0, 0)
    return camera
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
    const building_positions = [
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
function render() {
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
    for (let i = 5; i <= 16; i++) mp[i][7] = true
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
    const wheelMeshes = [-cx, cx].map(x => {
        const mesh = new THREE.Mesh(wheelGeometry, wheelMaterial)
        mesh.rotation.z = Math.PI * 0.5     // 将轮胎立起来
        mesh.position.set(x, wheelRadius, 0)
        mesh.castShadow = true
        car.add(mesh)
        return mesh
    })
    scene.add(car)
    return car
}
// 设置小车
function setTrolley() {
    const trolley = createTrolley()
    trolley.position.set(getWorldPosition(9,11).x,5,getWorldPosition(9,11).z)
}