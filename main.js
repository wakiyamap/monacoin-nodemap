// From https://github.com/ics-creative/160106_threejs_trigonometric
// 部分的に修正したり追加してます

	/** ノード情報取得 **/
	let citiesPoints = [];
	let versionCounts = new Map();
	let asNetworkCounts = new Map();
	let networkCounts = new Map();
	// シーン初期値
	const scene = new THREE.Scene();
	// renderer初期値
	const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
	// camera初期値
	const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);

// 初期設定だぞ
window.addEventListener('load', init);

// windowサイズの変更時の対処
window.addEventListener('resize', onResize);

function init() {

	fetch('https://api.mona-coin.de/nodemap/')
	.then(function(response) {
		return response.json();
	})
	.then(function(myJson) {
		for(let i in myJson){
			// 位置情報集計
			citiesPoints.push([myJson[i][10], myJson[i][11], myJson[i][12], myJson[i][14], myJson[i][3]])
			// バージョン情報カウント
			if (versionCounts.has(myJson[i][3])) {
				versionCounts.set(myJson[i][3], versionCounts.get(myJson[i][3]) + 1);
			}
			else {
				versionCounts.set(myJson[i][3], 1);
			}
			// AS情報カウント
			if (asNetworkCounts.has(myJson[i][13])) {
				asNetworkCounts.set(myJson[i][13], asNetworkCounts.get(myJson[i][13]) + 1);
			}
			else {
				asNetworkCounts.set(myJson[i][13], 1);
			}
			// ネットワーク情報カウント
			if (networkCounts.has(myJson[i][14])) {
				networkCounts.set(myJson[i][14], networkCounts.get(myJson[i][14]) + 1);
			}
			else {
				networkCounts.set(myJson[i][14], 1);
			}
		}

		// 表作成(バージョン情報)
		let ascVersionCounts = new Map([...versionCounts.entries()].sort().reverse());
		const versionTable = document.getElementById('version-table');
		for (let [key, value] of ascVersionCounts.entries()) {
			let tr = document.createElement('tr');
			for (let j = 0; j < 2; j++) {
				let td = document.createElement('td');
				if (j === 0) {
					td.innerHTML = key;
				}
				else {
					td.innerHTML = value;
				}
				tr.appendChild(td);
			}
			versionTable.appendChild(tr);
		}
		// 表作成(ネットワーク情報)
		let descNetworkCounts = new Map([...networkCounts.entries()].sort((a, b) => b[1] - a[1]));
		const networkTable = document.getElementById('network-table');
		for (let [key, value] of descNetworkCounts.entries()) {
			let tr = document.createElement('tr');
			for (let j = 0; j < 2; j++) {
				let td = document.createElement('td');
				if (j === 0) {
					td.innerHTML = key;
				}
				else {
					td.innerHTML = value;
				}
				tr.appendChild(td);
			}
			networkTable.appendChild(tr);
		}

		// リスト分のポイントをプロット。init対策
		for (let i = 0; i < citiesPoints.length; i++) {
			const latitude = citiesPoints[i][0];
			const longitude = citiesPoints[i][1];
			// ポイント
			const point = createPoint(
				i === 0
					? 0xff0000
					: (latitude === 90 ? 0x0000FF : 0x00FF00),
				latitude,
				longitude);
			scene.add(point);
		}
		return myJson;
	});

	console.log(citiesPoints);
	console.log(versionCounts);
	console.log(asNetworkCounts);
	console.log(networkCounts);

	createScene();
}

function createScene() {

	// カメラ
	camera.position.set(-250, 0, -250);
	camera.lookAt(new THREE.Vector3(0, 0, 0));

	// レンダラー
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	// カメラコントローラー
	const controller = new THREE.TrackballControls(camera, renderer.domElement);
	controller.noPan = true;
	controller.minDistance = 200;
	controller.maxDistance = 1000;

	// 地球
	const sea = createSea();
	scene.add(sea);
	const Land = createLand();
	scene.add(Land);

	// リスト分のポイントをプロット init時はデータ取得できてないので無がプロットされる
	// 後で定期取得した時のために残すか消すか考える
	//for (let i = 0; i < citiesPoints.length; i++) {
	//	const latitude = citiesPoints[i][0];
	//	const longitude = citiesPoints[i][1];
	//	// ポイント
	//	const point = createPoint(
	//		i === 0
	//			? 0xff0000
	//			: (latitude === 90 ? 0x0000FF : 0x00FF00),
	//		latitude,
	//		longitude);
	//	scene.add(point);
	//}

	// フレーム毎のレンダーを登録
	tick();

	function tick() {
		requestAnimationFrame(tick);
		 // 自転させる
		scene.rotation.y += 0.004;
		// カメラコントローラーの更新
		controller.update();
		renderer.render(scene, camera);
	}
}

/**
 * 海を生成します
 * @returns {THREE.Mesh} 球
 */
function createSea() {
	// 球
	return new THREE.Mesh(
		new THREE.SphereGeometry(98, 40, 40, 11, 11),
		new THREE.MeshBasicMaterial( {color: 0x00a6ed}),
	);
		//new THREE.MeshBasicMaterial({map: texture}));
}

/**
 * 陸を生成します
 * @returns {THREE.Mesh} 球
 */
function createLand() {
	// 球
	const texture = new THREE.TextureLoader().load('https://i.imgur.com/rc98N7f.png');
	return new THREE.Mesh(
		new THREE.SphereGeometry(100, 40, 40),
		new THREE.MeshBasicMaterial({map: texture, alphaTest: 0.5})
	);
}

/**
 * プロットする点を生成します
 * @param {number} color
 * @param {number} latitude
 * @param {number} longitude
 * @returns {THREE.Mesh} 円柱
 */
function createPoint(color, latitude = 0, longitude = 0) {
	// 円柱
	const sphere = new THREE.Mesh(
		new THREE.CylinderGeometry(0.5, 0.5, 2),
		new THREE.MeshBasicMaterial({color: 0xc93a40}));
	// 緯度経度から位置を設定
	sphere.position.copy(translateGeoCoords(latitude, longitude, 101));
	return sphere;
}

/**
 * 緯度経度から位置を算出します。
 * @param {number} latitude 緯度です。
 * @param {number} longitude 経度です。
 * @param {number} radius 半径です。
 * @returns {Vector3} 3Dの座標です。
 * @see https://ics.media/entry/10657
 */
function translateGeoCoords(latitude, longitude, radius) {
	// 仰角
	const phi = (latitude) * Math.PI / 180;
	// 方位角
	const theta = (longitude - 180) * Math.PI / 180;

	const x = -(radius) * Math.cos(phi) * Math.cos(theta);
	const y = (radius) * Math.sin(phi);
	const z = (radius) * Math.cos(phi) * Math.sin(theta);

	return new THREE.Vector3(x, y, z);
}

function onResize() {
	// サイズを取得
	const width = window.innerWidth;
	const height = window.innerHeight;

	// レンダラーのサイズを調整する
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height);

	// カメラのアスペクト比を正す
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
}

function popupImage() {
	const popup = document.getElementById('js-popup');
	if(!popup) return;

	const blackBg = document.getElementById('js-black-bg');
	const closeBtn = document.getElementById('js-close-btn');
	const showBtn = document.getElementById('js-show-popup');

	closePopUp(blackBg);
	closePopUp(closeBtn);
	closePopUp(showBtn);
	function closePopUp(elem) {
		if(!elem) return;
		elem.addEventListener('click', function() {
			popup.classList.toggle('is-show');
		});
	}
}
popupImage();