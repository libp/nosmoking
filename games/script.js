// 健康计算器
const smokingYearsInput = document.getElementById('smokingYears');
const lungColorIndexSpan = document.getElementById('lungColorIndex');

// 3D心脏实现
let scene, camera, renderer, heart;

function initHeart() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(300, 300);
    document.getElementById('heartContainer').appendChild(renderer.domElement);

    // 创建心脏模型
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0);
    heartShape.bezierCurveTo(0, -30, -50, -30, -50, 0);
    heartShape.bezierCurveTo(-50, 30, 0, 60, 0, 60);
    heartShape.bezierCurveTo(0, 60, 50, 30, 50, 0);
    heartShape.bezierCurveTo(50, -30, 0, -30, 0, 0);

    const extrudeSettings = {
        depth: 20,
        bevelEnabled: true,
        bevelSegments: 8,
        steps: 2,
        bevelSize: 3,
        bevelThickness: 3
    };

    const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    geometry.center();

    const material = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        specular: 0x444444,
        shininess: 30,
    });

    heart = new THREE.Mesh(geometry, material);
    scene.add(heart);

    // 添加环境光和平行光
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // 调整心脏大小和位置
    heart.scale.set(0.8, 0.8, 0.8);
    heart.rotation.x = Math.PI; // 翻转心脏
    heart.position.y = 10; // 稍微上移

    // 调整相机位置
    camera.position.z = 150;

    animate();
}

function animate() {
    requestAnimationFrame(animate);

    // 心跳动画 - 上下跳动和缩放
    const time = Date.now() * 0.001;
    const yPosition = Math.sin(time * 4) * 3; // 控制上下移动的幅度
    const scale = 0.8 + Math.sin(time * 4) * 0.05; // 控制缩放的幅度

    heart.position.y = 10 + yPosition;
    heart.scale.set(scale, scale, scale);

    renderer.render(scene, camera);
}

// 更新心脏健康状态
function updateHeartHealth(smokingYears) {
    const maxSmokingYears = 20;
    const healthFactor = Math.min(1, smokingYears / maxSmokingYears);
    
    // 计算颜色
    const r = Math.floor(255 * (1 - healthFactor));
    const g = Math.floor(50 * (1 - healthFactor));
    const b = Math.floor(50 * (1 - healthFactor));
    
    heart.material.color.setRGB(r / 255, g / 255, b / 255);
}

// 修改健康计算器的事件监听器
smokingYearsInput.addEventListener('input', function() {
    const smokingYears = parseInt(this.value) || 0;
    const lungColorIndex = Math.min(100, smokingYears * 5);
    lungColorIndexSpan.textContent = lungColorIndex;

    updateHeartHealth(smokingYears);
});

// 初始化3D心脏
initHeart();

// 经济影响计算器
const economicSmokingYearsInput = document.getElementById('economicSmokingYears');
const monthlyExpenseInput = document.getElementById('monthlyExpense');
const taxContributionSpan = document.getElementById('taxContribution');
const reducedLifespanSpan = document.getElementById('reducedLifespan');
const savedPensionSpan = document.getElementById('savedPension');

function calculateEconomicImpact() {
    const smokingYears = parseInt(economicSmokingYearsInput.value) || 0;
    const monthlyExpense = parseInt(monthlyExpenseInput.value) || 0;
    const taxContribution = smokingYears * 365 * (monthlyExpense / 30);
    const reducedLifespan = smokingYears * 365;
    const savedPension = taxContribution;

    taxContributionSpan.textContent = taxContribution.toFixed(2);
    reducedLifespanSpan.textContent = reducedLifespan;
    savedPensionSpan.textContent = savedPension.toFixed(2);
}

economicSmokingYearsInput.addEventListener('input', calculateEconomicImpact);
monthlyExpenseInput.addEventListener('input', calculateEconomicImpact);

// 吸烟模拟器
let puffs = 0;
const costPerCigarette = 1;
const costPerElectronicPuff = 0.1;
const puffsSpan = document.getElementById('puffs');
const savedMoneySpan = document.getElementById('savedMoney');

function smoke() {
    puffs++;
    puffsSpan.textContent = puffs;
    const savedMoney = (puffs * costPerCigarette) - (puffs * costPerElectronicPuff);
    savedMoneySpan.textContent = savedMoney.toFixed(2);
}