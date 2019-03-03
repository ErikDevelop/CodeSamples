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

    var orbit = function(pAxis, pZero, pRadius, pDegrees){
        radials;
        orbit_return_object = {};

        radials = (pDegrees / 180) * Math.PI;

        if(pAxis == 'z'){
            orbit_return_object.x = pZero.x + Math.cos(radials) * pRadius;
            orbit_return_object.y = pZero.y + Math.sin(radials) * pRadius;
            orbit_return_object.z = pZero.z;
        } else if(pAxis == 'y') {
            orbit_return_object.x = pZero.x + Math.cos(radials) * pRadius;
            orbit_return_object.y = pZero.y;
            orbit_return_object.z = pZero.z + Math.sin(radials) * pRadius;
        } else if(pAxis == 'x') {
            orbit_return_object.x = pZero.x;
            orbit_return_object.z = pZero.z + Math.cos(radials) * pRadius;
            orbit_return_object.y = pZero.y + Math.sin(radials) * pRadius;
        }

        return orbit_return_object;
    };

    var distance = function(pVector31, pVector32){
        return Math.sqrt(
            (pVector31.x - pVector32.x) * (pVector31.x - pVector32.x) +
            (pVector31.y - pVector32.y) * (pVector31.y - pVector32.y) +
            (pVector31.z - pVector32.z) * (pVector31.z - pVector32.z)
        );
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

                //self.interpolatePoints();
                PreloaderBridge().updateLoadProgress(15);

                self.drawPoints();
                self.colorPoints3();
                self.drawComponents();
            });
        });
    };

    self.update = function(){
       // if(typeof cloud != 'undefined') self.updateDrawpoints();
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

    self.colorPoints = function(){
        var y_positions_array = [];
        var y_temperatures_array = [];
        var y_slices_array = [];
        var gradient = [];

        //get all unique y values and the related temperatures, pairing them by index in two arrays.
        for (var yr = 0; yr < DATA.length; yr++){
            if(y_positions_array.indexOf(DATA[yr].position.y) === -1){
                y_positions_array.push(DATA[yr].position.y);
                y_temperatures_array.push([DATA[yr].celsius]);
            }
            else{
                y_temperatures_array[y_positions_array.indexOf(DATA[yr].position.y)].push(DATA[yr].celsius);
            }
        }

        //combining the arrays
        for(var ys = 0; ys < y_positions_array.length; ys++){
            var obj = {};
            obj.y = y_positions_array[ys];
            var average_temp = 0;

            for(var yt = 0; yt < y_temperatures_array[ys].length; yt++){
                average_temp += parseInt(y_temperatures_array[ys][yt]);
            }

            average_temp = average_temp / y_temperatures_array[ys].length;

            obj.celsius = average_temp;
            y_slices_array.push(obj);
        }

        //sorting the combined array by Z value
        y_slices_array.sort(function(a, b){
            return a.y > b.y;
        });

        //constructing the gradient
        for(var yh = 0; yh < BOXHEIGHT; yh++){
            if(yh < y_slices_array[0].y / CM){

                // Making a factor over the complete temperature spectrum using the current temperature.
                gradient[yh] = (y_slices_array[0].celsius - MINTEMPERATURE) / (MAXTEMPERATURE-MINTEMPERATURE);

            } else if(yh < y_slices_array[1].y  / CM){

                //Making a factor over the complete temperature spectrum using the calculated gradient step between two colors.
                gradient[yh] =
                    //Gradient calculation over these two temperatures, returning degrees C
                    ((y_slices_array[0].celsius +
                    ((yh - y_slices_array[0].y / CM) / (y_slices_array[1].y / CM - y_slices_array[0].y / CM)) * //Factor over this range of the gradient.
                    (y_slices_array[1].celsius - y_slices_array[0].celsius))- MINTEMPERATURE)
                    / (MAXTEMPERATURE-MINTEMPERATURE)

            } else if(yh < y_slices_array[2].y  / CM){

                //Making a factor over the complete temperature spectrum using the calculated gradient step between two colors.
                gradient[yh] =
                    //Gradient calculation over these two temperatures, returning degrees C
                    ((y_slices_array[1].celsius +
                    ((yh - y_slices_array[1].y / CM) / (y_slices_array[2].y / CM - y_slices_array[1].y / CM)) * //Factor over this range of the gradient.
                    (y_slices_array[2].celsius - y_slices_array[1].celsius))- MINTEMPERATURE)
                    / (MAXTEMPERATURE-MINTEMPERATURE)

            } else if(yh < y_slices_array[3].y  / CM){

                //Making a factor over the complete temperature spectrum using the calculated gradient step between two colors.
                gradient[yh] =
                    //Gradient calculation over these two temperatures, returning degrees C
                    ((y_slices_array[2].celsius +
                    ((yh - y_slices_array[2].y / CM) / (y_slices_array[3].y / CM - y_slices_array[2].y / CM)) * //Factor over this range of the gradient.
                    (y_slices_array[3].celsius - y_slices_array[2].celsius))- MINTEMPERATURE)
                    / (MAXTEMPERATURE-MINTEMPERATURE);

            } else {

                //Making a factor over the complete temperature spectrum using the current temperature.
                gradient[yh] = (y_slices_array[3].celsius - MINTEMPERATURE) / (MAXTEMPERATURE-MINTEMPERATURE);
            }

            for(var cx = 0; cx < BOXWIDTH; cx++){
                for(var cz = 0; cz < BOXDEPTH; cz++){
                    for(var cy = 0; cy < BOXHEIGHT; cy++){
                        var index = cz * BOXWIDTH*BOXHEIGHT + cy *BOXWIDTH + cx;
                        CloudTemperatureBuffer.setX(ReverseRandomIndex[index],gradient[cy]);
                    }
                }
            }
        }

        self.loading_progress = 100;
    };

    self.colorPoints2 = function(){
        var heat_array = [];

        //create an array of unique z and y positions, allong with all temperatures sensed at those coordinates.
        for (var zr = 0; zr < DATA.length; zr++){
            var targetZ = Math.floor(DATA[zr].position.z / CM);

            if(typeof heat_array[targetZ] == 'undefined') heat_array[targetZ] = [];
            if(typeof heat_array[targetZ][DATA[zr].position.y] == 'undefined') heat_array[targetZ][DATA[zr].position.y] = [];
            heat_array[targetZ][DATA[zr].position.y].push(DATA[zr].celsius);
        }

        //Calculate the averages over all z-y positions.
        for(var hzi = 0; hzi < heat_array.length; hzi++){
            if(typeof heat_array[hzi] != 'undefined'){
                for(var hyi = 0; hyi < heat_array[hzi].length; hyi++){
                    if(typeof heat_array[hzi][hyi] != 'undefined'){
                        var avgTemp = 0;

                        for(var hti = 0; hti < heat_array[hzi][hyi].length; hti++){
                            avgTemp = avgTemp + parseInt(heat_array[hzi][hyi][hti]);
                        }

                        avgTemp = avgTemp / heat_array[hzi][hyi].length;
                        heat_array[hzi][hyi] = avgTemp;
                    }
                }
            }
        }

        //Draw the gradients
        for(var gzi = 0; gzi < heat_array.length; gzi++){
            if(typeof heat_array[gzi] != 'undefined') {
                var latest_y = 0;
                var next_y = 0;

                for(var nyi = 0; nyi < BOXHEIGHT * CM; nyi++){
                    if(typeof heat_array[gzi][nyi] != 'undefined'){
                        next_y = nyi;
                        break;
                    }
                }

                var gradient = [];

                for (var gyi = 0; gyi < BOXHEIGHT; gyi++){
                    if(gyi * CM > next_y){
                        latest_y = next_y;
                        for(var nyi = gyi * CM; nyi < BOXHEIGHT * CM; nyi++){
                            if(typeof heat_array[gzi][nyi] != 'undefined'){
                                next_y = nyi;
                                break;
                            } else if(nyi == BOXHEIGHT * CM - 1) next_y = BOXHEIGHT * CM;
                        }
                    }

                    if (latest_y == 0) {
                        gradient[gyi] = (heat_array[gzi][next_y] - MINTEMPERATURE) / (MAXTEMPERATURE - MINTEMPERATURE);
                    } else if (next_y == BOXHEIGHT * CM) {
                        gradient[gyi] = (heat_array[gzi][latest_y] - MINTEMPERATURE) / (MAXTEMPERATURE - MINTEMPERATURE);
                    } else {
                        // Making a factor over the complete temperature spectrum using the calculated gradient step between two colors.
                        gradient[gyi] =
                            // Gradient calculation over these two temperatures, returning degrees C
                            ((heat_array[gzi][latest_y] +
                            ((gyi - latest_y / CM) / (next_y / CM - latest_y / CM)) * //Factor over this range of the gradient.
                            (heat_array[gzi][next_y] - heat_array[gzi][latest_y]))- MINTEMPERATURE)
                            / (MAXTEMPERATURE-MINTEMPERATURE);
                    }
                }

                heat_array[gzi] = gradient;
            }
        }
        //Fill in the pointcloud
        var last_z = 0;
        for(var nzi = 0; nzi < BOXHEIGHT * CM; nzi++){
            if(typeof heat_array[nzi] != 'undefined'){
                last_z = nzi;
                break;
            }
        }

        for(var cz = 0; cz < BOXDEPTH; cz++) {
            if(typeof heat_array[cz] != 'undefined') last_z = cz;

            for(var cx = 0; cx < BOXWIDTH; cx++){
                for(var cy = 0; cy < BOXHEIGHT; cy++){
                    var index = cz * BOXWIDTH*BOXHEIGHT + cy *BOXWIDTH + cx;
                    CloudTemperatureBuffer.setX(ReverseRandomIndex[index],heat_array[last_z][cy]);
                }
            }

        }
    };

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

    /*self.interpolatePoints = function(){
        var y_slices_array = [];
        var x_positions_array = [];
        var x_slices_array = [];
        var zsteps = (BOXDEPTH * CM) / 46;

        for (var yr = 0; yr < DATA.length; yr++){
            if(y_slices_array.indexOf(DATA[yr].position.y) === -1) y_slices_array.push(DATA[yr].position.y);
            if(x_positions_array.indexOf(DATA[yr].position.x) === -1) x_positions_array.push(DATA[yr].position.x);
        }

        console.log(y_slices_array);
        console.log(x_positions_array);
        console.log(x_positions_array);
        console.log(x_positions_array.sort());
        console.log(x_positions_array[0]);
        console.log(x_positions_array[x_positions_array.length - 1]);

        x_slices_array.push(x_positions_array[0] / 2);
        x_slices_array.push(BOXWIDTH * CM / 2);
        x_slices_array.push(BOXWIDTH * CM - ((BOXWIDTH * CM - x_positions_array[x_positions_array.length - 1]) / 2));

        console.log(x_slices_array);

        for(var ys = 0; ys < y_slices_array.length; ys++){
            for(var xs = 0; xs < x_slices_array.length; xs++){
                for(var zs = 0; zs < zsteps; zs++){
                    DATA.push({celsius: "46.5", position: {x:x_slices_array[xs],y:y_slices_array[ys],z:46 * zs}, type: "Environmental"});
                }
            }
        }
    };*/

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

    self.updateDrawpoints = function(){
        if ((updateCounter+1)*BOXWIDTH*BOXHEIGHT > particleCount) {
            updateCounter =0;
        }

        //update temperatures
        for (var i = updateCounter*BOXWIDTH*BOXHEIGHT; i < (updateCounter+1)*BOXWIDTH*BOXHEIGHT; i++) {
            var averagetemp = 0;
            var averagecounter = 0;

            oldtemp = CloudTemperatureBuffer.getX(i);
            averagetemp = oldtemp;
            averagecounter++;

            posindex = RandomIndex[i];

            //left of posindex;
            if (((posindex - 1) % BOXWIDTH < posindex % BOXWIDTH) && (posindex-1 > 0)) {
                var lefttemp = CloudTemperatureBuffer.getX(ReverseRandomIndex[posindex-1]);
                averagetemp += lefttemp
                averagecounter++;

                if (lefttemp > oldtemp) {
                    averagetemp += lefttemp*2
                    averagecounter+=2;
                }
            }
            //right of posindex;
            if (((posindex + 1) % BOXWIDTH > posindex % BOXWIDTH) && (posindex+1 < particleCount)) {
                var righttemp = CloudTemperatureBuffer.getX(ReverseRandomIndex[posindex+1]);
                averagetemp += righttemp;
                averagecounter++;
                if (righttemp > oldtemp) {
                    averagetemp += righttemp*2;
                    averagecounter+=2;
                }
            }
            //top of posindex;
            if ((((posindex / BOXWIDTH) % BOXHEIGHT) > (((posindex-BOXWIDTH) / BOXWIDTH) % BOXHEIGHT)) && (posindex-BOXWIDTH > 0)) {
                var toptemp= CloudTemperatureBuffer.getX(ReverseRandomIndex[posindex-BOXWIDTH]);
                averagetemp += toptemp;
                averagecounter++;
                if (toptemp > oldtemp) {
                    averagetemp += toptemp*2;
                    averagecounter+=2;
                }
            }
            //bottom of posindex;
            if ((((posindex / BOXWIDTH) % BOXHEIGHT) < (((posindex+BOXWIDTH) / BOXWIDTH) % BOXHEIGHT)) && (posindex+BOXWIDTH < particleCount)) {
                var bottomtemp = CloudTemperatureBuffer.getX(ReverseRandomIndex[posindex+BOXWIDTH]);
                averagetemp += bottomtemp;
                averagecounter++;
                if (bottomtemp > oldtemp) {
                    averagetemp += bottomtemp*2;
                    averagecounter+=2;
                }
            }
            //front of posindex;
            if ( ((posindex / (BOXWIDTH*BOXHEIGHT)) > ((posindex-BOXWIDTH*BOXHEIGHT) / (BOXWIDTH*BOXHEIGHT))) && (posindex-BOXWIDTH*BOXHEIGHT > 0)) {
                var fronttemp= CloudTemperatureBuffer.getX(ReverseRandomIndex[posindex-BOXWIDTH*BOXHEIGHT]);
                averagetemp += fronttemp;
                averagecounter++;
                if (fronttemp > oldtemp) {
                    averagetemp += fronttemp*2;
                    averagecounter+=2;
                }
            }
            //back of posindex;
            if ( ((posindex / (BOXWIDTH*BOXHEIGHT)) < ((posindex+BOXWIDTH*BOXHEIGHT) / (BOXWIDTH*BOXHEIGHT))) && (posindex+BOXWIDTH*BOXHEIGHT < particleCount)) {
                var backtemp = CloudTemperatureBuffer.getX(ReverseRandomIndex[posindex+BOXWIDTH*BOXHEIGHT]);
                averagetemp += backtemp;
                averagecounter++;
                if (backtemp > oldtemp) {
                    averagetemp += backtemp	*2;
                    averagecounter+=2;
                }
            }

            var newtemp = (averagetemp / (averagecounter))*damping;
            CloudTemperatureBuffer.setX(i,newtemp);
        }

        for(var j = 0; j < DATA.length; j++){
            var t = (Math.min(Math.max( (DATA[j].celsius-15) / (MAXTEMPERATURE-15) , 0), 1));

            var xs = Math.floor(DATA[j].position.x / VERTEXSIZE);
            var ys = Math.floor(DATA[j].position.y / VERTEXSIZE);
            var zs = Math.floor(DATA[j].position.z / VERTEXSIZE);

            var index = zs * BOXWIDTH*BOXHEIGHT + ys *BOXWIDTH + xs;
            CloudTemperatureBuffer.setX(ReverseRandomIndex[index],t);

            var xs = Math.ceil(DATA[j].position.x / VERTEXSIZE);
            var ys = Math.ceil(DATA[j].position.y / VERTEXSIZE);
            var zs = Math.ceil(DATA[j].position.z / VERTEXSIZE);

            var index = zs * BOXWIDTH*BOXHEIGHT + ys *BOXWIDTH + xs;
            CloudTemperatureBuffer.setX(ReverseRandomIndex[index],t);

        }
        CloudTemperatureBuffer.needsUpdate = true;
        updateCounter++;
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