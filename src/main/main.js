// 为ui面板添加交互逻辑
import * as THREE from 'three';
import { BoxGeometry, BufferGeometry, CylinderGeometry, DirectionalLight, Group, LineBasicMaterial, MeshPhongMaterial, PerspectiveCamera, PlaneGeometry, SphereGeometry, Vector2, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/linegeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/linematerial.js';
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import * as dat from "dat.gui";
let scene = new THREE.Scene()

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight);
let c = document.getElementById('c')

c.appendChild(renderer.domElement);
renderer.setClearColor(0xaaaaaa)    // 设置背景色
renderer.shadowMap.enabled = true   // 开启投影
function makeCamera(fov = 40) {
    const aspect = 2
    const zNear = 0.1
    const zFar = 1000
    return new PerspectiveCamera(fov, aspect, zNear, zFar)
}

const camera = makeCamera()
camera.position.set(200, 200, 200)
camera.lookAt(0, 0, 0)
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

const textArr = [
    '0号房子',
    '1号房子',
    '2号房子',
    '3号房子',
    '4号房子',
]
// 创建地面
const SCWIDTH = 500
const SCHEIGHT = 500
const blockWidth = 50
const blockHeight = 50

// 小车行驶的速度
let speed = 0



const groundGeometry = new THREE.PlaneGeometry(SCWIDTH, SCHEIGHT)
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xcc8866 })
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
groundMesh.rotation.x = Math.PI * -0.5
groundMesh.receiveShadow = true
scene.add(groundMesh)

renderer.render(scene, camera);
function getWorldPosition(x, z) {
    return {
        x: (-SCWIDTH / 2) + x * blockWidth,
        z: (-SCHEIGHT / 2) + z * blockHeight
    }
}
const building_positions = [
    [6, 2],
    [5, 7],
    [8, 5],
    [2, 7],
    [3, 8],
    [6, 5]  // 交点
]
const loader = new GLTFLoader();



building_positions.forEach((position, index) => {
    if (index > 4) return
    let worldPosition = getWorldPosition(position[0], position[1])
    let x = worldPosition.x
    let z = worldPosition.z
    let url = './model/building_' + (index + 1) + '.gltf'
    loader.load(url, function (gltf) {
        const building = new THREE.Group()
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const size = box.getSize(new THREE.Vector3())
        let proportionX = 50 / size.x
        let proportionY = 50 / size.y
        let proportionZ = 50 / size.z
        gltf.scene.scale.set(proportionX, proportionY, proportionZ)
        gltf.scene.position.set(x, 0, z)
        gltf.scene.rotation.y = Math.PI * 0.5
        gltf.scene.castShadow = true
        building.add(gltf.scene)

        let mark = document.createElement('div')
        mark.className = "building"
        c.appendChild(mark)
        let img = document.createElement('img')
        img.className = "img"
        img.src = "./img/tag.png"
        mark.appendChild(img)
        let name = document.createElement('div')
        name.className = "name"
        name.innerHTML = index + "号房子"
        mark.appendChild(name)
        const marktag = new CSS2DObject(mark)
        marktag.position.set(gltf.scene.position.x, 50, gltf.scene.position.z)
        marktag.scale.set(0.5,0.5,0.5)
        building.add(marktag)
        marktag.layers.set(0)
        scene.add(building);
    })
})




const roads = new Array(10).fill(0).map(v => new Array(10).fill(0)) // 存储每条路的曲线

for (let i = 1; i < 5; i++) {
    getroad(0, i);
}
// 创建小车
// 设置小车位置
const carPosition = new Vector2()
const car = new THREE.Group()

scene.add(car)

// 绘制小车车身
const sideLength = 8
const bodyGeometry = new THREE.BoxGeometry(sideLength, sideLength, sideLength); // 绘制立方体
const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x6688aa })
const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
bodyMesh.castShadow = true // 允许投射阴影
bodyMesh.position.y = sideLength / 2
car.add(bodyMesh)

// 绘制汽车轮胎
const wheelRadius = 3 // 轮胎圆柱体的半径
const wheelThickness = 1.8 // 轮胎的厚度
const wheelSegments = 20  // 分划
// 绘制圆柱体
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
let carPo = getWorldPosition(building_positions[0][0], building_positions[0][1])
// 设置小车的初始位置
car.position.set(carPo.x, 0, carPo.z)
carPosition.x = carPo.x
carPosition.y = carPo.z

// 生成 bA - bB 的道路
function getroad(bA, bB) {
    let aposition = getWorldPosition(building_positions[bA][0], building_positions[bA][1])
    let ax = aposition.x
    let az = aposition.z
    let bposition = getWorldPosition(building_positions[bB][0], building_positions[bB][1])
    let bx = bposition.x
    let bz = bposition.z
    const curve = new THREE.SplineCurve([
        new THREE.Vector2(ax,az),
        new THREE.Vector2(ax + (bx - ax) / 2,az + (bz - az) / 3),
        new THREE.Vector2(bx,bz),
    ])
    const points = curve.getPoints(50)  // 生成点集


    let geometry = new THREE.BufferGeometry()
    let pointArr = []
    points.forEach(v => {
        pointArr = pointArr.concat([v.x, 1, v.y])
    })
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pointArr, 3));
    let roadmaterial = new THREE.LineBasicMaterial({ color: 0xff0000});
    let road = new THREE.Line(geometry, roadmaterial);
    roads[bA][bB] = curve
    scene.add(road)


    const curve2 = new THREE.SplineCurve([
        new THREE.Vector2(bx,bz),
        new THREE.Vector2(ax + (bx - ax) / 2, az + (bz - az) / 3),
        new THREE.Vector2(ax,az),
    ])
    const points2 = curve2.getPoints(50)  // 生成点集

    let geometry2 = new THREE.BufferGeometry()
    let pointArr2 = []
    points2.forEach(v => {
        pointArr2 = pointArr2.concat([v.x, 1, v.y])
    })
    geometry2.setAttribute('position', new THREE.Float32BufferAttribute(pointArr2, 3));
    let roadmaterial2 = new THREE.LineBasicMaterial({ color: 0xff0000});
    let road2 = new THREE.Line(geometry2, roadmaterial2);
    roads[bB][bA] = curve2
    scene.add(road2)
}

//
let fp = false // 判断场景中此时是否有路线箭头
let currentArrowMesh = []

let ismove = false   // 规定小车目前的状态
let lasttime = 0     // 表示上一次刷新时候的时间
let movetime = 0     // 此次任务的时间
let vmove = 0        // 移动的速度   
let startPosition = 0   // 标记小车目前的位置
let endPosition = -1

let checkboxDiv = document.createElement('div');



// ui面板设计
let objBuildings = {
    '0号房子': 0,
    '1号房子': 1,
    '2号房子': 2,
    '3号房子': 3,
    '4号房子': 4,
}
const gui = new dat.GUI()
let target = -1
const obj = {
    Position: 0,
    text:   textArr[startPosition],
    status: '小车空闲中',
    speed: 0,
    onClickButton: function() {
        if(target != -1) {
            if(this.status == '小车正忙' || target == startPosition) return
            else printroad(startPosition,target)
        } else alert('请重新选择目的地')
    }
};
let controllerText = gui.add(obj,'text').name('小车所在位置')
let statusText = gui.add(obj,'status').name('小车的状态')
gui.add(obj, 'Position', ['0号房子', '1号房子', '2号房子', '3号房子', '4号房子']).name('终点').onChange(function (value) {
    let cursor = objBuildings[value]
    target = cursor
    console.log('target',target)
});
let objspeed = {
    '1m/s': 1,
    '5m/s': 5,
    '8m/s': 8,
    '15m/s': 15
}
gui.add(obj,'speed',['1m/s','5m/s','8m/s','15m/s']).name('小车速度').onChange(function(value) {
    speed = objspeed[value]
})

gui.add(obj, 'onClickButton').name('\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0开始配送');



let labelRenderer
function initLabelRenderer() {
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth - 201, window.innerHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    document.getElementById("c").appendChild(labelRenderer.domElement);
}

initLabelRenderer()

// 生成道路
getroad(5, 2)
getroad(5, 0)
getroad(5, 1)


// 小车从bA -> bB的这一过程
function moveto(bA, bB, v) {
    if (startPosition == bA) {
        ismove = true
        statusText.setValue('小车正忙')
        movetime = 0
        endPosition = bB
        vmove = v
    }
}

let movequeue = []



// Dijkstra算法记录路径

// 从bA -> bB

let dist = new Array(10).fill(0)
let vis = new Array(10).fill(false)
let path = new Array(10).fill(-1)
function dijkstra(bA, bB) {
    for (let i = 0; i < 10; i++) {
        dist[i] = Infinity
        vis[i] = false
        path[i] = -1
    }
    dist[bA] = 0
    for (let i = 0; i < 10; i++) {
        let t = -1
        for (let j = 0; j < 10; j++) {
            if (!vis[j] && (t == -1 || dist[j] < dist[t])) t = j
        }
        if (t == bB) {
            break
        }
        vis[t] = true
        for (let k = 0; k < 10; k++) {
            let d = Infinity
            if (roads[t][k] != 0) d = roads[t][k].getLength()
            if (t == k) d = 0
            if (dist[t] + d < dist[k]) {
                dist[k] = dist[t] + d
                path[k] = t
            }
        }
    }
    return dist[bB]
}
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
      gl_FragColor = vec4(1.0,1.0,0.0, 1.0);
    }
`;
// 打印目前的最短路
function printroad(bA, bB) {
    let len = dijkstra(bA, bB)
    if(len == Infinity) return
    let stack = []
    let p = bB
    while (path[p] != -1) {
        stack.push(p)
        p = path[p]
    }
    stack.push(p)
    for (let i = stack.length - 1; i > 0; i--) {
        movequeue.push([stack[i], stack[i - 1], speed])
        getArrowLine(roads[stack[i]][stack[i - 1]])
    }
    // console.log(movequeue[0])
    // movequeue[0]()
    // movequeue.push(() => moveto(0, 1, 5))
    console.log("路径的总长度为", len, "米")
    let messages = "路径为"
    while (stack.length > 1) {
        messages += stack.pop()
        messages += "->"
    }
    messages += stack.pop()
    console.log(messages)
}

// printroad(2, 0)
// printroad(1,4)






//

// 绘制一条从(0,0,0) -> (100,0,0)带有箭头的路线

// 绘制线


function getArrowLine(curve) {
    const numPoints =  Math.floor(curve.getLength() / 15)
    const points = curve.getPoints(numPoints)  // 生成点集

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 1; i < points.length; i++) {
        let directionVector = new THREE.Vector2(points[i].x - points[i - 1].x,points[i].y - points[i - 1].y).normalize()
        let dx = directionVector.x * 2.5
        let dy = directionVector.y * 2.5
        let x0 = points[i].x
        let y0 = points[i].y
        let x1 = x0 - dx
        let y1 = y0 - dy
        let v1 = new THREE.Vector3(dx,0,dy)
        let v2 = new THREE.Vector3(0,1,0)
        let perpendicular = new THREE.Vector3().crossVectors(v1,v2).normalize()
        let x3 = x1 - dx + perpendicular.x * 2.5
        let y3 = y1 - dy + perpendicular.z * 2.5
        let x2 = x3 - perpendicular.x * 2 * 2.5
        let y2 = y3 - perpendicular.z * 2 * 2.5
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
    mesh.position.y = 5
    currentArrowMesh.push(mesh)
    fp = true
    scene.add(mesh)
}






//



function render(time) {
    time *= 0.001
    if (!ismove) {
        if (movequeue.length > 0) {
            let movearr = movequeue.shift()
            console.log(movearr)
            moveto(movearr[0], movearr[1], movearr[2])
        } else {
            if(endPosition != -1 && fp) {
                fp = false
                // console.log(currentArrowMesh)
                while(currentArrowMesh.length > 0) {
                    let now = currentArrowMesh.pop()
                    // console.log(now)
                    scene.remove(now)
                    
                    now.geometry.dispose()
                    now.material.dispose()
                }
            }
        }
        controllerText.setValue(textArr[startPosition]) // 更新ui面板上显示的小车位置
    } else {
        movetime += (time - lasttime)
        lasttime = time
        let len = roads[startPosition][endPosition].getLength()
        if (movetime * vmove < len) {
            roads[startPosition][endPosition].getPointAt(movetime * vmove / len, carPosition)
            // 设置小车朝向
            car.lookAt(carPosition.x, 0, carPosition.y)
            // 设置小车位置
            car.position.set(carPosition.x, 0, carPosition.y)
            // 车轱辘的转动
            wheelMeshes.forEach(obj => {
                obj.rotation.x = time * 3
            })
        } else {
            ismove = false
            statusText.setValue('小车空闲中')
            startPosition = endPosition
            controllerText.setValue(textArr[startPosition])
        }
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera)
    requestAnimationFrame(render);
}


let control = new OrbitControls(camera, labelRenderer.domElement);
// let control = new OrbitControls(camera,renderer.domElement)
control.enableRotate = true; //启用旋转
control.enablePan = true; //启用平移
control.enableZoom = true;//启用缩放


requestAnimationFrame(render)