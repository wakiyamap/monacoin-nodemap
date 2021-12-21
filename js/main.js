// From https://github.com/ics-creative/160106_threejs_trigonometric
// 部分的に修正したり追加してます

	/** ノード情報取得 **/
	let citiesPoints = new Map();
	let versionCounts = new Map();
	let asNetworkCounts = new Map();
	let networkCounts = new Map();
	// シーン初期値
	const scene = new THREE.Scene();
	// renderer初期値
	const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
	// camera初期値
	const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
	// 衝突判定用レイヤ
	let raycaster = new THREE.Raycaster();
	let mouse = new THREE.Vector2();

	// animation mixer
	let mixer;
	let animations;
	let clock = new THREE.Clock();
	let runningMixer;

// 初期設定だぞ
window.addEventListener('load', init);

// windowサイズの変更時の対処
window.addEventListener('resize', onResize);

// プロットしたノードオブジェクトに対する衝突判定を行うためのマウスクリック位置
window.addEventListener('click', onmousemove);

function init() {

	fetch('https://api.mona-coin.de/nodemap/')
	//fetch('http://192.168.100.3/one.json')
	.then(function(response) {
		return response.json();
	})
	.then(function(myJson) {
		for(let i in myJson){
			// 位置情報集計 TORはリストからは除外
			if (myJson[i][13] !== "TOR") {
				citiesPoints.set(myJson[i][0]+":"+myJson[i][1], [myJson[i][10], myJson[i][11], myJson[i][12], myJson[i][14], myJson[i][3]])
			}
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
		for (let [key, value] of citiesPoints.entries()) {
			const latitude = value[0];
			const longitude = value[1];
			// ポイント
			const point = createPoint(
				key === 0
					? 0xff0000
					: (latitude === 90 ? 0x0000FF : 0x00FF00),
				latitude,
				longitude,
				key);
			//scene.add(point);
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
	controller.minDistance = 150;
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
		scene.rotation.y += 0.0005;
		// カメラコントローラーの更新
		controller.update();
		renderer.render(scene, camera);

		// animationの更新
		if(mixer){
			mixer.update(clock.getDelta());
		}
	}
}

/**
 * 海を生成します
 * @returns {THREE.Mesh} 球
 */
function createSea() {
	// 球
	return new THREE.Mesh(
		new THREE.SphereBufferGeometry(98, 40, 40, 11, 11),
		new THREE.MeshBasicMaterial( {color: 0x00a6ed}),
	);
}

/**
 * 陸を生成します
 * @returns {THREE.Mesh} 球
 */
function createLand() {
	// 球
	const texture = new THREE.TextureLoader().load('img/worldmap.png');
	return new THREE.Mesh(
		new THREE.SphereBufferGeometry(100, 40, 40),
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
function createPoint(color, latitude = 0, longitude = 0, locationid) {
//	// 円柱
//	const cylinderBufferGeometry = new THREE.Mesh(
//		new THREE.CylinderBufferGeometry(0.5, 0.5, 2),
//		new THREE.MeshBasicMaterial({color: 0xc93a40}));
//	// 緯度経度から位置を設定
//	// IP+portをLocationIDとしてnameに保管
//	cylinderBufferGeometry.name = {LocationID: locationid};
//	cylinderBufferGeometry.position.copy(translateGeoCoords(latitude, longitude, 101));
//	return cylinderBufferGeometry;

	const loader = new THREE.GLTFLoader();
	loader.setCrossOrigin( 'anonymous' );
	loader.load('https://storageapi.fleek.co/wakiyamap-team-bucket/mona-object/scene.gltf', function (gltf) {
		const object = gltf.scene;
		// IP+portをLocationIDとしてnameに保管
		object.name = {LocationID: locationid};
		// 0.25倍にobject縮小
		object.scale.set(0.4, 0.4, 0.4);
		// 緯度経度から回転角度を計算
		object.rotation.set(0.0 , longitude * Math.PI / 180.0 , (270.0 + latitude) * Math.PI / 180.0);
		// 緯度経度からxyz座標を計算
		object.position.copy(translateGeoCoords(latitude, longitude, 100));

		// light
		const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.015);

		// lightを表示
		scene.add(ambientLight);
		// アニメーション動作
		animations = gltf.animations;
		mixer = new THREE.AnimationMixer(object);

		let action = mixer.clipAction(animations[0]);
		action.uncacheRoot;
		action.play();

		// オブジェクトを表示
		scene.add(object);

	}, undefined, function (error) {
		console.error( error );
	});

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

// リサイズされた時に描画を更新
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

// マウスクリック位置判定
function onmousemove(e) {
	// マウス位置(3D)
	mouse.x = (e.clientX/window.innerWidth) *2 - 1;
	mouse.y = - (e.clientY/window.innerHeight)*2 + 1;

	raycaster.setFromCamera(mouse, camera);
	let intersects = raycaster.intersectObjects(scene.children, true);
	// 背後の地球まで判定されるので3D Objectに限定させる
	for ( let i = 0; i < intersects.length; i++ ) {
		if (intersects[i].object.name == "polySurface1_lambert1_0") {
			let dom = document.getElementsByClassName("textboard-element")[0];
			dom.innerHTML = intersects[i].object.parent.parent.parent.parent.parent.parent.parent.parent.name.LocationID+"</br>"+
				citiesPoints.get(intersects[i].object.parent.parent.parent.parent.parent.parent.parent.parent.name.LocationID)[3]+"</br>"+
				citiesPoints.get(intersects[i].object.parent.parent.parent.parent.parent.parent.parent.parent.name.LocationID)[4];
			object = intersects[i].object;
			mixer.setTime(0);
			mixer = new THREE.AnimationMixer(object);
			let action = mixer.clipAction(animations[0]);
			action.play();
			// 今動き出した奴を覚えさせる
			runningMixer = mixer;
		}
	}
}

// グラフ用popup表示
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
