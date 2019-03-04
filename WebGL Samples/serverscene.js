/*
 * This is the scene Object that does all the heavy lifting for us.
 * It enters at Init, and the renderer later calls DrawScene and manages the updates for us.
 */
var ServerScene = function(){
    var self = this;
    var scene;
    var orbit_degrees;
    var aspect_ratio;
    var cloud_geometry;
    var cloud;
    var radials;
    var orbit_return_object;
    var factor;
    var distance_factor;
    var temperature_factor;
    var x;
    var y;
    var z;
    var r;
    var g;
    var b;
    var points;
    var cloud_positions;
    var cloud_colors;
    var cloud_counter;
    var distanceTo;
    var joined_array;
    var distance_array;
    var temperature_array;
    var distance_array_sorted;
    var temperature_array_sorted;
    var tempColor;
    var data_manager;
    var MAXr;
    var MINr;
    var MAXg;
    var MINg;
    var MAXb;
    var alphas;
    var MINb;
    var COLLADA_loader;
    var dae;
    var server_material;
    var cloudGeometry;
    var CloudCoordBuffer;
    var CloudTemperatureBuffer;
    var RandomIndex;
    var ReverseRandomIndex;
    var updateCounter;
    var oldtemp;
    var posindex;
    var processorColor;
    var processorGeometry;
    var processorMaterial;
    var processorMesh;
    var edgyGeometry;
    var edgyMaterial;
    var edgy;
    var loadingSteps;
    var particleIterator;
    var damping = .99;

    var CM = 10;
    var M = CM * 100;
    var VERTEXSIZE = CM;
    var BOXWIDTH = 116;
    var BOXDEPTH = 58;
    var BOXHEIGHT = 91;
    var WIDTHSLICES = 2;
    var DEPTHSLICES = 12;
    var MAXDISTANCE = 50;
    var MAXTEMPERATURE = 60;
    var MINTEMPERATURE = 15;
    var DISTANCE = 2.5;
    var MAXCOMPONENTTEMPERATURE = 80;
    var DATA;
    var CPUDATA;
    var particleCount = BOXWIDTH * BOXDEPTH * BOXHEIGHT;

    self.camera;
    self.loading_progress;

    /*
     * The Init function sets a few basic values for us.
     */
    var init = function(){
        self.camera = new THREE.PerspectiveCamera(70, aspect_ratio, 1, 5 * M);
        scene = new THREE.Scene();
        cloud_geometry = new THREE.BufferGeometry();
        orbit_degrees = 0;
        x = 0;
        y = 0;
        z = 0;

        points = (BOXWIDTH * BOXHEIGHT * BOXDEPTH);
        alphas = new Float32Array(points);
        cloud_positions = new Float32Array(points * 3);
        cloud_colors = new Float32Array(points * 3);
        cloud_counter = 0;
        distanceTo = 0;
        joined_array = [];
        distance_array_sorted = [];
        temperature_array_sorted = [];
        tempColor = new THREE.Color();
        DATA = [];
        CPUDATA = [];

        PreloaderBridge().updateLoadProgress(5);
    };

    function shuffle(array) {
        var c = array.length, t, r;
        // While there remain elements to shuffle...
        while (0 !== c) {
            // Pick a remaining element...
            r = Math.floor(Math.random() * c);
            c -= 1;
            // And swap it with the current element.
            t = array[c];
            array[c] = array[r];
            array[r] = t;
        }
        return array;
    }

    var gradientProgression = function(pdistance, ptemperature){
        distance_factor = Math.min(Math.max(pdistance / MAXDISTANCE, 0), 1);
        temperature_factor = 1 - (Math.min(Math.max(ptemperature / MAXCOMPONENTTEMPERATURE, 0), 1));

        factor = distance_factor + temperature_factor;
        if(factor <= .14){
            MAXr = 215;
            MINr = 247;
            MAXg = 61;
            MINg = 140;
            MAXb = 77;
            MINb = 85;
        } else if(factor <= .28){
            MAXr = 247;
            MINr = 254;
            MAXg = 140;
            MINg = 224;
            MAXb = 85;
            MINb = 133;
        } else if(factor <= .42){
            MAXr = 254;
            MINr = 252;
            MAXg = 224;
            MINg = 248;
            MAXb = 133;
            MINb = 191;
        } else if(factor <= .56){
            MAXr = 252;
            MINr = 229;
            MAXg = 248;
            MINg = 236;
            MAXb = 191;
            MINb = 150;
        }  else if(factor <= .70){
            MAXr = 229;
            MINr = 153;
            MAXg = 236;
            MINg = 209;
            MAXb = 150;
            MINb = 144;
        }  else {
            MAXr = 153;
            MINr = 47;
            MAXg = 209;
            MINg = 136;
            MAXb = 144;
            MINb = 191;
        }

        r = Math.round(MAXr + factor * (MINr - MAXr));
        g = Math.round(MAXg + factor * (MINg - MAXg));
        b = Math.round(MAXb + factor * (MINb - MAXb));

        r= r/255;
        g=g/255;
        b=b/255;

        return {r: r, g: g, b: b, a: factor};
    };

    /*
     * This is where the first significant draw gets made.
     */
    self.drawScene = function(){
        data_manager = DataManager.getInstance();

        if(typeof data_manager.distance != 'undefined') DISTANCE = data_manager.distance;

        if(typeof data_manager.startingPosition != 'undefined'){
            if(data_manager.startingPosition == 'top'){
                self.camera.position.y = DISTANCE * M;
                self.camera.rotateZ = -90;
            } else if(data_manager.startingPosition == '34th') {
                self.camera.position.z = ((DISTANCE / 5) * 4) * M;
                self.camera.position.x = ((DISTANCE / 5) * 4) * M;
                self.camera.position.y = ((DISTANCE / 5) * 2) * M;
                self.camera.rotateY = 45;
            } else if(data_manager.startingPosition == 'right') {
                self.camera.position.x = DISTANCE * M;
                self.camera.rotateY = 90;
            } else if(data_manager.startingPosition == 'left') {
                self.camera.position.x = -DISTANCE * M;
                self.camera.rotateY = -90;
            } else {
                self.camera.position.z = DISTANCE * M;
            }
        } else {
            self.camera.position.z = DISTANCE * M;
        }

        scene.add(self.camera);

        if(typeof data_manager.maxTemp != 'undefined') MAXTEMPERATURE = data_manager.maxTemp;
        if(typeof data_manager.minTemp != 'undefined') MINTEMPERATURE = data_manager.minTemp;

        document.getElementById('minTempValue').innerHTML = String(MINTEMPERATURE);
        document.getElementById('maxTempValue').innerHTML = String(MAXTEMPERATURE);

        data_manager.getData(function(response){
            for(var m=0; m < response.data.length; m++){
                if(response.data[m].type == 'Environmental')DATA.push(response.data[m]);
                else if(response.data[m].type == 'Component')CPUDATA.push(response.data[m]);
            }

            distance_array = new Float32Array(DATA.length);
            temperature_array = new Float32Array(DATA.length);

            COLLADA_loader = new THREE.ColladaLoader();
            COLLADA_loader.options.convertUpAxis = true;
            COLLADA_loader.load('models/asperitas_test6.dae', function(collada){
                dae = collada.scene;
                server_material = new THREE.MeshBasicMaterial({wireframe:false, color: 0x000000});
                dae.traverse(function(child){
                    if (child instanceof THREE.Mesh){
                        child.material = server_material;
                    }
                });

                dae.scale.x = dae.scale.y = dae.scale.z = 1000;
                dae.translateY(0 - ((BOXHEIGHT * CM) / 2));
                dae.updateMatrix();

                scene.add(dae);

                PreloaderBridge().updateLoadProgress(15);

                self.drawPoints();
                self.colorPoints3();
                self.drawComponents();
            });
        });
    };

    self.update = function(){
    };

    self.fixedUpdate = function(){
        if(typeof self.loading_progress != 'undefined'  && PreloaderBridge().getLoadProgress() != 100){
            if(PreloaderBridge().getLoadProgress() < self.loading_progress) PreloaderBridge().updateLoadProgress(1);
        }

        if(PreloaderBridge().getLoadProgress() >= 98 && PreloaderBridge().getLoadProgress() != 100){
            PreloaderBridge().setLoadProgress(100);
            PreloaderBridge().ruinPreloader();
        }
    };

    self.afterUpdate = function(){};

    /*
     * This function draws all the points in the Pointcloud
     */
    self.drawPoints = function(){
        updateCounter = 0;

        cloudGeometry = new THREE.BufferGeometry();
        CloudCoordBuffer = new THREE.BufferAttribute( new Float32Array(particleCount * 3),3,1);
        CloudTemperatureBuffer = new THREE.BufferAttribute( new Float32Array(particleCount),1,1).setDynamic(true);

        x = 0;
        y = 0;
        z = 0;

        RandomIndex = [];
        ReverseRandomIndex = [];
        loadingSteps = particleCount / 84;
        particleIterator = 0;
        self.loading_progress = PreloaderBridge().getLoadProgress();

        for ( var i = 0; i < particleCount; i++) {
            RandomIndex[i] = i;
        }

        shuffle(RandomIndex);

        for ( var i = 0; i < particleCount; i ++) {
            var j = RandomIndex[i];

            ReverseRandomIndex[j]=i;

            var color = new THREE.Color();
            var matrix = new THREE.Matrix4();

            x = (j % BOXWIDTH) * 2 - BOXWIDTH;
            y = ((j / BOXWIDTH) % BOXHEIGHT) * 2 - BOXHEIGHT;
            z = BOXDEPTH - (j/ (BOXWIDTH*BOXHEIGHT)) * 2;

            var px = x * VERTEXSIZE + Math.random() * VERTEXSIZE * 2 - 5;
            var py = y * VERTEXSIZE + Math.random() * VERTEXSIZE * 2 - 5;
            var pz = z * VERTEXSIZE + Math.random() * VERTEXSIZE * 2 - 5;

            CloudCoordBuffer.setXYZ(i,px,py,pz);
            CloudTemperatureBuffer.setX(i,0);

            particleIterator++;
            if(particleIterator >= loadingSteps){
                particleIterator = 0;
                self.loading_progress += 1;
            }
        }

        var rawMaterial = new THREE.RawShaderMaterial( {
            uniforms: {
                map: { value: new THREE.TextureLoader().load( "temperature.png" ) }
            },
            vertexShader: document.getElementById( 'vertexshader' ).textContent,
            fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
            depthTest: true,
            depthWrite: true,
            transparent: true,
            blending:THREE.NormalBlending
        });

        cloudGeometry.addAttribute( "position", CloudCoordBuffer);
        cloudGeometry.addAttribute( "temperature", CloudTemperatureBuffer);
        cloud = new THREE.Points(cloudGeometry, rawMaterial);
        scene.add(cloud);
    };

    /*
     * This function gives them color through the shaders and a custom temperature buffer.
     */
    self.colorPoints3 = function(){
        var heat_array = [];

        //create an array of slices over the z axis, each split in two over the x axis, every 'block' containing the diffirent temperatures contained within.
        for (var zr = 0; zr < DATA.length; zr++){
            var targetZ = Math.floor((DATA[zr].position.z / CM) - ((DATA[zr].position.z / CM) % (BOXDEPTH / DEPTHSLICES)));
            var targetX = (DATA[zr].position.x / CM) - ((DATA[zr].position.x / CM) % (BOXWIDTH / WIDTHSLICES));
            var targetY = Math.floor((DATA[zr].position.y / CM));

            if(typeof heat_array[targetZ] == 'undefined') heat_array[targetZ] = [];
            if(typeof heat_array[targetZ][targetX] == 'undefined') heat_array[targetZ][targetX] = [];
            if(typeof heat_array[targetZ][targetX][targetY] == 'undefined') heat_array[targetZ][targetX][targetY] = [];
            heat_array[targetZ][targetX][targetY].push(DATA[zr].celsius);
        }

        //get averages per x-y-z slice.
        for(var zs = 0; zs < heat_array.length; zs++){
            if(typeof heat_array[zs] != 'undefined') {
                for (var xs = 0; xs < heat_array[zs].length; xs++) {
                    if(typeof heat_array[zs][xs] != 'undefined') {
                        for(var ys = 0; ys < heat_array[zs][xs].length; ys++){
                            if(typeof heat_array[zs][xs][ys] != 'undefined') {
                                var totalTemp = 0;

                                for(var ts = 0; ts < heat_array[zs][xs][ys].length; ts++){
                                    totalTemp = (totalTemp + parseFloat(heat_array[zs][xs][ys][ts]));
                                }

                                totalTemp = totalTemp / heat_array[zs][xs][ys].length;

                                heat_array[zs][xs][ys] = totalTemp;
                            }
                        }
                    }
                }
            }
        }

        //creates a gradient over the height of the y axis for every z-x slice.
        //goes over all positions on the z axis until it finds the start of a slice.
        for(var gzi = 0; gzi <= heat_array.length; gzi++){
            if(typeof heat_array[gzi] != 'undefined') {
                //goes over all positions on the x axis inside this z-slice until it finds the start of a slice.
                for(var gxi = 0; gxi <= heat_array[gzi].length; gxi++){
                    if(typeof heat_array[gzi][gxi] != 'undefined') {
                        //we are now on a z-x slice, where we'll start creating the gradient.
                        //we calculate how many steps there are when we evenly spread all temperatures along the box's height.
                        var lastStep = 0;
                        var nextStep = 0;
                        var gradient = [];
                        var stepSize = 0;

                        for(var yi = 0; yi < heat_array[gzi][gxi].length; yi++){
                            if(typeof heat_array[gzi][gxi][yi] != 'undefined') {
                                nextStep = yi;
                                stepSize = nextStep - lastStep;

                                var nextColor = heat_array[gzi][gxi][nextStep];
                                if(lastStep == 0) var lastColor = heat_array[gzi][gxi][nextStep];
                                else var lastColor = heat_array[gzi][gxi][lastStep];

                                var diff = nextColor - lastColor;
                                var stepsVolume = diff / stepSize;

                                for(var si = 0; si < stepSize; si++){
                                    var temp = parseFloat(lastColor) + (parseFloat(stepsVolume) * si);

                                    gradient.push((parseFloat(temp) - MINTEMPERATURE) / (MAXTEMPERATURE - MINTEMPERATURE));
                                }

                                lastStep = nextStep;
                            }
                        }

                        for(var ri = lastStep; ri < BOXHEIGHT; ri++){
                            gradient.push((parseFloat(heat_array[gzi][gxi][lastStep]) - MINTEMPERATURE) / (MAXTEMPERATURE - MINTEMPERATURE));
                        }

                        heat_array[gzi][gxi] = gradient;
                    }
                }
            }
        }

        //Fill in the pointcloud
        var last_z = 0;
        var last_x = 0;
        for(var nzi = 0; nzi < BOXHEIGHT * CM; nzi++){
            if(typeof heat_array[nzi] != 'undefined'){
                last_z = nzi;
                break;
            }
        }

        for(var cz = 0; cz < BOXDEPTH; cz++) {
            if(typeof heat_array[cz] != 'undefined') last_z = cz;

            for(var cx = 0; cx < BOXWIDTH; cx++){
                if(typeof heat_array[last_z][cx] != 'undefined') last_x = cx;

                for(var cy = 0; cy < BOXHEIGHT; cy++){
                    var index = cz * BOXWIDTH*BOXHEIGHT + cy *BOXWIDTH + cx;
                    CloudTemperatureBuffer.setX(ReverseRandomIndex[index],heat_array[last_z][last_x][cy]);
                }
            }

        }
    };

    /*
     * This function draws all the components, the visible parts with a measurement of their own.
     */
    self.drawComponents = function(){
        for(var c = 0; c < CPUDATA.length; c++){
            processorColor = gradientProgression(0, CPUDATA[c].celsius);
            processorGeometry =  new THREE.BoxGeometry(15,15,3, 1, 1, 1);
            processorMaterial = new THREE.MeshBasicMaterial({wireframe: false});
            processorMaterial.color.setRGB(processorColor.r, processorColor.g, processorColor.b);
            processorMesh = new THREE.Mesh(processorGeometry, processorMaterial);
            scene.add(processorMesh);

            processorMesh.translateX(0 - ((BOXWIDTH * CM) / 2) + parseInt(CPUDATA[c].position.x));
            processorMesh.translateY(0 - ((BOXHEIGHT * CM) / 2) + parseInt(CPUDATA[c].position.y));
            processorMesh.translateZ(((BOXDEPTH * CM) / 2) - parseInt(CPUDATA[c].position.z));

            edgyGeometry = new THREE.EdgesGeometry(processorMesh.geometry);
            edgyMaterial = new THREE.LineBasicMaterial({color: 0x0000000, linewidth: 4});
            edgy = new THREE.LineSegments( edgyGeometry, edgyMaterial );
            processorMesh.add(edgy);
        }
    };

    self.setAspectRatio = function(pRatio){
        aspect_ratio = pRatio;
        self.camera.aspect = pRatio;
        self.camera.updateProjectionMatrix();
    };

    self.getCamera = function(){
        return self.camera;
    };

    self.getScene = function(){
        return scene;
    };

    init();
};