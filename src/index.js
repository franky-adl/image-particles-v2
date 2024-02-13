// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import gsap from "gsap"

// Core boilerplate code deps
import { createCamera, createComposer, createRenderer, runApp, updateLoadingProgressBar, getDefaultUniforms } from "./core-utils"

// Other deps
import vertex from "./shaders/vertex.glsl"
import fragment from "./shaders/fragment.glsl"
import Mask from "./assets/mask.jpg"
import Heineken from "./assets/heineken.png"
import Pineapple from "./assets/pineapple.png"
import { loadTexture } from "./common-utils"

global.THREE = THREE
// previously this feature is .legacyMode = false, see https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
// turning this on has the benefit of doing certain automatic conversions (for hexadecimal and CSS colors from sRGB to linear-sRGB)
THREE.ColorManagement.enabled = true

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
}
const uniforms = {
  ...getDefaultUniforms(),
}


/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  // best practice: ensure output colorspace is in sRGB, see Color Management documentation:
  // https://threejs.org/docs/#manual/en/introduction/Color-management
  _renderer.outputColorSpace = THREE.SRGBColorSpace
})

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(65, 0.1, 3000, { x: 0, y: 0, z: 1000 })

const rand = (a,b) => {
  return a + (b-a)*Math.random()
}

/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    // this.controls = new OrbitControls(camera, renderer.domElement)
    // this.controls.enableDamping = true

    await updateLoadingProgressBar(0.1)

    let t1 = await loadTexture(Heineken)
    let t2 = await loadTexture(Pineapple)
    this.textures = [
      t1, t2
    ]
    let maskTexture = await loadTexture(Mask)
    this.move = 0

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.point = new THREE.Vector2()

    this.geometry = new THREE.BufferGeometry()
    let number = 512 * 512;

    this.positions = new THREE.BufferAttribute(new Float32Array(number * 3), 3)
    this.coordinates = new THREE.BufferAttribute(new Float32Array(number * 3), 3)
    this.speeds = new THREE.BufferAttribute(new Float32Array(number), 1)
    this.offset = new THREE.BufferAttribute(new Float32Array(number), 1)
    this.direction = new THREE.BufferAttribute(new Float32Array(number), 1)
    this.press = new THREE.BufferAttribute(new Float32Array(number), 1)

    let index = 0
    for (let i =0; i < 512; i++) {
      let posX = i - 256
      for (let j =0; j < 512; j++) {
        let posY = j - 256
        this.positions.setXYZ(index, posX*2, posY*2, 0)
        this.coordinates.setXYZ(index, i, j, 0)
        this.speeds.setX(index, rand(0.4, 1))
        this.offset.setX(index, rand(-1000, 1000))
        this.direction.setX(index, Math.random()>0.5?1:-1)
        this.press.setX(index, rand(1,3))
        index++
      }
    }

    this.geometry.setAttribute("position", this.positions)
    this.geometry.setAttribute("aCoordinates", this.coordinates)
    this.geometry.setAttribute("aOffset", this.offset)
    this.geometry.setAttribute("aSpeed", this.speeds)
    this.geometry.setAttribute("aDirection", this.direction)
    this.geometry.setAttribute("aPress", this.press)

    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        ...uniforms,
        progress: {value: 0.0},
        t1: {type: "t", value: this.textures[0]},
        t2: {type: "t", value: this.textures[1]},
        mask: {type: "t", value: maskTexture},
        mousePressed: {type: "f", value: 0},
        move: {type: "t", value: 0},
        mouse: {type: "t", value: null}
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
      depthWrite: false
    })

    scene.add(new THREE.Points(this.geometry, this.material))

    this.mouseEffects()

    // GUI controls
    const gui = new dat.GUI()

    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)

    await updateLoadingProgressBar(1.0, 100)
  },
  mouseEffects() {

    this.test = new THREE.Mesh(
      new THREE.PlaneGeometry(2000,2000),
      new THREE.MeshBasicMaterial()
    )

    window.addEventListener("mousedown", (e) => {
      gsap.to(this.material.uniforms.mousePressed, {
        duration: 1,
        value: 1,
        ease: "elastic.out(1,0.3)"
      })
    })

    window.addEventListener("mouseup", (e) => {
      gsap.to(this.material.uniforms.mousePressed, {
        duration: 1,
        value: 0,
        ease: "elastic.out(1,0.3)"
      })
    })

    window.addEventListener("mousewheel", (e) => {
      this.move += e.wheelDeltaY/100
    })

    window.addEventListener("mousemove", (e) => {
      this.mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
	    this.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

      this.raycaster.setFromCamera( this.mouse, camera );

      // calculate objects intersecting the picking ray
      let intersects = this.raycaster.intersectObjects( [this.test] );
      this.point.x = intersects[0].point.x
      this.point.y = intersects[0].point.y
    }, false)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    // this.controls.update()
    this.stats1.update()

    this.material.uniforms.move.value = this.move
    this.material.uniforms.mouse.value = this.point
  }
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, uniforms, undefined)
