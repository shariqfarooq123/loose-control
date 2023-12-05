
function degrees_to_radians(degrees)
{
    var pi = Math.PI;
    return degrees * (pi/180);
}

function b64ToUrl(b64){
    const blob = b64toBlob(b64, 'application/octet-stream');
    const url = URL.createObjectURL(blob);
    return url;
}

async function loadMeshes(scene, root){
	// meshPaths are 0 to 8.babylon
	// const meshPaths = [];
	// for (let i = 0; i < 8; i++) {
	// 	const meshPath = root + i + ".babylon";
	// 	meshPaths.push(meshPath);
	// }
    const meshPaths = [meshb64_0, meshb64_1, meshb64_2, meshb64_3, meshb64_4, meshb64_5, meshb64_6, meshb64_7, meshb64_8];
	let meshes = [];
	for (let i = 0; i < meshPaths.length; i++) {
		const meshPath = meshPaths[i];
		const mesh = await BABYLON.SceneLoader.ImportMeshAsync("", b64ToUrl(meshPath), "", scene)
		meshes.push(mesh.meshes[0]);
	}
	return meshes;
}


function colorMesh(mesh, color, scene, alpha){
	mesh.material = new BABYLON.StandardMaterial("material", scene);
	mesh.material.diffuseColor = color;
	mesh.material.specularColor = color
	mesh.material.emissiveColor = color;
	mesh.material.ambientColor = color;

	mesh.material.alpha = alpha || 1;
}

function colorMeshes(meshes, color, scene, alpha){
	for (let i = 0; i < meshes.length; i++) {
		const mesh = meshes[i];
		colorMesh(mesh, color, scene, alpha);
	}
}

const scale = {
	min: {value: -30, hue: 1},
	max: {value: 50, hue: 245}
} 
function hslToHex(h, s, l) {
	l /= 100;
	const a = s * Math.min(l, 1 - l) / 100;
	const f = n => {
		const k = (n + h / 30) % 12;
	  	const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
	  	return Math.round(255 * color).toString(16).padStart(2, '0');  
	};
	return `#${f(0)}${f(8)}${f(4)}`;
}
function temperatureToColor(temp, maxValue, minValue){
	temp = Math.min(maxValue, Math.max(minValue, temp));
	const range = maxValue - minValue;
	const hueRange = scale.max.hue - scale.min.hue;
	const value =  (temp - minValue) / range;
	const hue = scale.max.hue - hueRange * value;
	
	return hslToHex(hue, 100, 50)
}




// var scene;


async function onSceneLoaded(scene, root, card){
	var camera = scene.cameras[0];
	scene.activeCamera = camera;

	scene.clearColor = new BABYLON.Color4(0,0,0,0);
	// add light
	// var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
	// var light1 = new BABYLON.HemisphericLight("light2", new BABYLON.Vector3(1, 1, 1), scene);
	// var light1 = new BABYLON.HemisphericLight("light3", new BABYLON.Vector3(-1, -1, -1), scene);
	// var light1 = new BABYLON.DirectionalLight("light4", new BABYLON.Vector3(0, -1, 0), scene);
	// var light1 = new BABYLON.DirectionalLight("light4", new BABYLON.Vector3(-1, -1, -1), scene);
	// var light1 = new BABYLON.DirectionalLight("light4", new BABYLON.Vector3(1, 1, 1), scene);


	// console.log("scene", scene)
	scene.meshes.map((mesh) => {
		colorMesh(mesh, new BABYLON.Color4(0.0,0,0,0), scene, 1.0);
		mesh.onBeforeRenderObservable.add(() => scene.getEngine().setColorWrite(false));
		mesh.onAfterRenderObservable.add(() => scene.getEngine().setColorWrite(true));
	});
	const meshes = await loadMeshes(scene, card.dataset.root + "/scene/");
	const meshCenters = meshes.map((mesh) => mesh.getBoundingInfo().boundingBox.centerWorld);
	meshes.map((mesh) => {
		colorMesh(mesh, new BABYLON.Color3.Red(), scene, 0.001);
	}
	);


	const dsm = new BABYLON.DeviceSourceManager(scene.getEngine());
	var dragging = false;
	var clickStartTimer = undefined;

	const imgUrl = root + "/gen/0.png";
	card.querySelector(".background").style.backgroundImage = "url('" + imgUrl + "')";
	var hasBeenDragged = false;
	scene.onPointerObservable.add((eventData) => {
		const type = eventData.type;
		if (dragging && scene.pointerX && scene.pointerY){
			if (!hasBeenDragged) {
				hasBeenDragged = true;
				if (card.querySelector('.drag-pointer').classList.contains('should-animate')) {
					card.querySelector('.drag-pointer').classList.remove('should-animate');
				}
			}
			var ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), camera);	
			var hit = scene.pickWithRay(ray);
			if (!hit || !hit.pickedPoint) return;
			var point = hit.pickedPoint;
			// check which mesh is closest to the point
			let closestMeshIndex = 0;
			let closestDistance = 1000000
			var distances = [];
			for (let i = 0; i < meshCenters.length; i++) {
				const meshCenter = meshCenters[i];
				const distance = BABYLON.Vector3.Distance(point, meshCenter);
				distances.push(distance);
				if (distance < closestDistance) {
					closestDistance = distance;
					closestMeshIndex = i;
				}
			}
			// color the mesh
			// const closestMesh = meshes[closestMeshIndex];
			// colorMesh(closestMesh, new BABYLON.Color3.Green(), scene, 0.1);
			// color according to distance
			const maxDistance = Math.max(...distances);
			const minDistance = Math.min(...distances);
			const distanceRange = maxDistance - minDistance;
			meshes.map((mesh, i) => {
				const distance = distances[i];
				const distanceRatio = (distance - minDistance) / distanceRange;
				const maxDistanceRatio = (maxDistance - minDistance) / distanceRange;
				// const color = new BABYLON.Color3(distanceRatio, 0, 0);
				const alpha = 0.0 * (distanceRatio) + 0.001;
				// colorMesh(mesh, color, scene, alpha);
				colorMesh(mesh, new BABYLON.Color3.FromHexString(temperatureToColor(distance, maxDistance, minDistance)), scene, alpha);
			});

			const imgUrl = root + "/gen/" + closestMeshIndex + ".png";
			card.querySelector(".background").style.backgroundImage = "url('" + imgUrl + "')";
		}

		if (type === BABYLON.PointerEventTypes.POINTERDOWN){
			// colorMeshes(meshes, new BABYLON.Color3.FromHexString("#FF6F91"), scene, 0.9);
			// colorMeshes(meshes, new BABYLON.Color3.Red(), scene, 0.9);
			// colorMeshes(meshes, new BABYLON.Color3(1.0,0.41,0.7), scene, 0.4);
			// colorMeshes(meshes, new BABYLON.Color3.Green(), scene, 0.1);
			clickStartTimer = window.setTimeout(() => {
				dragging = true;
			}, 100);
		}
		else if (type === BABYLON.PointerEventTypes.POINTERUP){
			window.clearTimeout(clickStartTimer);
			dragging = false;
			colorMeshes(meshes, new BABYLON.Color3.Red(), scene, 0.001);
		}
	});





	scene.executeWhenReady(function () {
		scene.getEngine().runRenderLoop(function () {
			scene.render();
		});
	});
}
const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
  
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
  
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
  
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
  
    const blob = new Blob(byteArrays, {type: contentType});
    return blob;
  }

function loadScene(path, engine, card){
	// const raw_content = BABYLON.Tools.DecodeBase64(sceneb64);
    // const raw_content = BABYLON.Tools.DecodeBase64UrlToBinary(sceneb64);
    // const blob = new Blob([raw_content]);
    // const blob = new Blob([sceneb64], {type: 'application/octet-stream'});
    // console.log("sceneb64", sceneb64)
    const blob = b64toBlob(sceneb64, 'application/octet-stream');
    // console.log("blob", blob)
    const url = URL.createObjectURL(blob);
    // BABYLON.SceneLoader.Load(path + '/scene/', "scene.babylon", engine, (scene) => onSceneLoaded(scene, path, card));
    BABYLON.SceneLoader.Load("", url, engine, (scene) => onSceneLoaded(scene, path, card), undefined, undefined, ".babylon");
}



function mountScenes(){
    document.querySelectorAll('.interactive-card').forEach(card => {
        const root = card.dataset.root;
        // Get the canvas element
        const canvas = card.querySelector("canvas");
        engine = new BABYLON.Engine(canvas, true,  { preserveDrawingBuffer: true, stencil: true, premultipliedAlpha: false  }); // Generate the BABYLON 3D engine
        engine._caps.textureFloatRender = true;
        loadScene(root, engine, card);       
    });


    // drag animation
	document.querySelectorAll('.interactive-image').forEach(card => {
		const showAnimation = () => {
			// check if classList contains 'should-animate'
			if (card.querySelector('.drag-pointer').classList.contains('should-animate')) {
				card.querySelector('.drag-pointer').classList.add('animated');
			}
		};
		
		const hideAnimation = () => {
			card.querySelector('.drag-pointer').classList.remove('animated');
		};
		
		card.addEventListener('mouseover', showAnimation);
		card.addEventListener('mouseleave', hideAnimation);
		
	});
	
}