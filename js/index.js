// CHANGE DURING DEMO!
const toriCount = 30;
const sparkRotation = 0.05;
const sparkDistance = 100;
const lightIntensity = 0.5;

const createVisual = scene => {
    const clock = new THREE.Clock();

    // rings in the background that breathe during playback
    const tori = new THREE.Group();
    // rotating icosehedron that pulse based on music
    const sparks = new THREE.Group();

    // make a torus
    const torusFor = (radius, tube) => {
        const torus = new THREE.Mesh(
            new THREE.TorusBufferGeometry(radius, tube, 32, 8),
            new THREE.MeshPhongMaterial({
                color: Math.random() * 0xFFFFFF,
                shading: THREE.FlatShading }));


        torus.position.z -= 500;
        return torus;
    };

    // create concentric torus meshes staggered by their diameters
    const toriBy = step => {
        const tori = [];
        for (let i = 1; i < 100 * toriCount; i += step) {
            tori.push(torusFor(i, step));
        }
        return tori;
    };

    // make a pulsating spark
    const sparkFor = (color, x, y, z) => {
        const spark = new THREE.Mesh(
            new THREE.IcosahedronGeometry(50),
            new THREE.MeshPhongMaterial({
                color,
                shading: THREE.FlatShading,
                shininess: 200 }));


        spark.position.set(x, y, z);
        return spark;
    };

    // run in requestAnimationFrame loop
    const animate = () => {
        const delta = clock.getDelta();

        // spin group of sparks as one
        sparks.rotation.x += delta * sparkRotation;
        sparks.rotation.y += delta * sparkRotation;

        // if there isn't audio loaded yet, bail
        if (!components) return;
        const { audio, analyser } = components;

        const average = analyser.getAverageFrequency();
        // `bytes` has 16 elements, half of the 32 fed to the Analyser 
        const bytes = analyser.getFrequencyData();
        // if there isn't data from the music playback, bail
        if (!audio.isPlaying || !average) return;

        sparks.children.map((spark, i) => {
            // don't affect the center spark
            if (i === 0) return;
            // take chunk of frequency data roughly matching index of spark
            // to influence how large it scales
            const newScale = Math.max((bytes[i * 2] + bytes[i * 2 - 1]) / 128, 1);
            spark.scale.set(newScale, newScale, newScale);
        });

        // breathe torus rings on z axis
        tori.children.map((torus, index) => {
            torus.position.z += Math.sin(Date.now() * 0.001 - index / 16);
        });
    };

    // combine tori into one group
    tori.add(...toriBy(100));

    // spread around sparks
    const pos = 3 * sparkDistance;
    const neg = -3 * sparkDistance;
    sparks.add(sparkFor(0xFFFFFF, 0, 0, 0));
    sparks.add(sparkFor(0xFF0000, pos, 0, 0));
    sparks.add(sparkFor(0x00FF00, 0, pos, 0));
    sparks.add(sparkFor(0x0000FF, 0, 0, pos));
    sparks.add(sparkFor(0xFFFF00, neg, 0, 0));
    sparks.add(sparkFor(0x00FFFF, 0, neg, 0));
    sparks.add(sparkFor(0xFF00FF, 0, 0, neg));

    scene.add(tori);
    scene.add(sparks);

    return { animate };
};

// hook up context and analyser to audio source for animation loop
const loadAudio = file => {
    const audio = new THREE.Audio(new THREE.AudioListener());
    const analyser = new THREE.AudioAnalyser(audio, 32);
    const context = new (window.AudioContext || window.webkitAudioContext)();

    // transform ArrayBuffer from file input for THREE.Audio
    // and enable playback control
    context.decodeAudioData(file, buffer => {
        audio.setBuffer(buffer);
        audio.setLoop(true);

        // update ui for play/pause button 
        document.body.classList.add('loaded');
        const button = document.querySelector('.controls button');
        button.addEventListener('click', () => {
            audio.isPlaying ? audio.pause() : audio.play();
            button.classList.toggle('playing', audio.isPlaying);
        });
    });

    return { analyser, audio };
};

// base three.js setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 1, 10000);
camera.position.z = 1000;
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

scene.add(new THREE.AmbientLight(0x000000));
const lights = Array.from(Array(3)).map(() => new THREE.PointLight(0xffffff, lightIntensity));
lights[0].position.set(-600, -400, 500);
lights[1].position.set(0, 400, 500);
lights[2].position.set(600, -400, 500);
scene.add(...lights);

// transform data from file <input> into ArrayBuffer for audio
// analysis using FileReader
let components;
document.querySelector('input').addEventListener('change', evt => {
    const reader = new FileReader();
    reader.onload = file => components = loadAudio(file.target.result);
    reader.readAsArrayBuffer(evt.target.files[0]);
});
const visual = createVisual(scene);

document.body.appendChild(renderer.domElement);

const animate = () => {
    visual.animate();
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
};
animate();
