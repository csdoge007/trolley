
import * as THREE from 'three';
import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, renderer, camera
let buildingPositions = []
const SCWIDTH = 1000, SCHEIGHT = 1000, blockWidth = 50, blockHeight = 50
main()
function main() {
    scene = createScene()
    renderer = createRenderer()
    camera = createCamera()
    const light = createLight()
    const control = createControl()
    const ground = createGround()
    const stBuilding = createStBuilding()
    createRoad()
    createBuildings(stBuilding)
    requestAnimationFrame(render)
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
        [6, 5]  // 交点
    ]
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
// 创建房子
function createHouse() {
    const house = new THREE.Group()
    const sideWall = createSideWall(house)
    const sideWall2 = createSideWall(house)
    sideWall2.position.z = 30;
    createFrontWall(house)
    scene.add(house)
    return house
}
// 创建照相机控制器
function createControl() {
    let control = new OrbitControls(camera, renderer.domElement);
    control.enableRotate = true; //启用旋转
    control.enablePan = true; //启用平移
    control.enableZoom = true;//启用缩放
    return control
}
// 渲染函数
function render() {
    renderer.render(scene, camera)
    requestAnimationFrame(render)
}
// 创建侧墙
function createSideWall(house) {
    // const shape = new THREE.Shape();
    // shape.moveTo(-10, 0);
    // shape.lineTo(10, 0);
    // shape.lineTo(10, 10);
    // shape.lineTo(0, 15);
    // shape.lineTo(-10, 10);
    // shape.lineTo(-10, 0);
    // const extrudeGeometry = new THREE.ExtrudeGeometry(shape);
    const heartShape = new THREE.Shape();

    heartShape.moveTo(25, 25);
    heartShape.bezierCurveTo(25, 25, 20, 0, 0, 0);
    heartShape.bezierCurveTo(- 30, 0, - 30, 35, - 30, 35);
    heartShape.bezierCurveTo(- 30, 55, - 10, 77, 25, 95);
    heartShape.bezierCurveTo(60, 77, 80, 55, 80, 35);
    heartShape.bezierCurveTo(80, 35, 80, 0, 50, 0);
    heartShape.bezierCurveTo(35, 0, 25, 25, 25, 25);

    const extrudeSettings = { depth: 8, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 };
    const extrudeGeometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);

    const loader = new THREE.TextureLoader()
    const sideWall = new THREE.Mesh(extrudeGeometry, new THREE.MeshBasicMaterial());
    loader.load('./img/wall.jpg', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.01, 0.005);
        sideWall.material.map = texture;
        house.add(sideWall);
    })
    return sideWall;
}
// 创建前墙
function createFrontWall(house) {
    const shape = new THREE.Shape();
    shape.moveTo(-15, 0);
    shape.lineTo(15, 0);
    shape.lineTo(15, 10);
    shape.lineTo(-15, 10);
    shape.lineTo(-15, 0);

    const window = new THREE.Path();
    window.moveTo(3, 3)
    window.lineTo(8, 3)
    window.lineTo(8, 8)
    window.lineTo(3, 8);
    window.lineTo(3, 3);
    shape.holes.push(window);

    const door = new THREE.Path();
    door.moveTo(-3, 0)
    door.lineTo(-3, 8)
    door.lineTo(-8, 8)
    door.lineTo(-8, 0);
    door.lineTo(-3, 0);
    shape.holes.push(door);

    const extrudeGeometry = new THREE.ExtrudeGeometry(shape)

    const loader = new THREE.TextureLoader()
    loader.load('./img/wall.jpg', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.01, 0.005);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const frontWall = new THREE.Mesh(extrudeGeometry, material);
        frontWall.position.z = 15;
        frontWall.position.x = 10;
        frontWall.rotation.y = Math.PI * 0.5;
        house.add(frontWall);
    });
}
// 创建道路贴图
function createRoad() {
    createTexture('./img/road.png', (texture) => {
        for (let i = 0; i < 5; i++) {
            const textureGeometry = new THREE.PlaneGeometry(blockWidth, blockHeight)
            const textureMesh = new THREE.Mesh(textureGeometry, new THREE.MeshBasicMaterial({ map: texture }))
            textureMesh.rotation.x = -0.5 * Math.PI;
            textureMesh.receiveShadow = true
            textureMesh.position.set(i * 50, 1,0)
            scene.add(textureMesh)
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
