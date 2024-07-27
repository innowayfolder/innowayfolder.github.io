const productList = {
    "feeder": {
        "total": 5,
        "key": "feeder",
        "name": "Feeder",
        "products": [
            {
                "key": "feeder-classic",
                "name": "Feeder Classic",
                "youtube": {
                    "src": "https://www.youtube.com/embed/R-VC-olFN-A",
                },
                "image": "Feeder Classic.jpg",
                "brochure": "Feeder Classic.pdf"
            },
            {
                "key": "feeder-2-lanes",
                "name": "Feeder - 2 Lanes",
                "youtube": {
                    "src": "https://www.youtube.com/embed/_yiJLdMJcWU",
                },
                "image": "Feeder-2 Lanes.jpg",
                "brochure": "Feeder-2 Lanes.pdf"
            },
            {
                "key": "remote-preparation-buffer-system",
                "name": "Remote preparation and buffer System",
                "youtube": {
                    "src": "https://www.youtube.com/embed/EfZ6vuB9ZoA"
                },
                "image": "Remote Preparation and Buffer System.jpg",
                "brochure": "Remote Preparation and Buffer System.pdf"
            },
            {
                "key": "feeder-ns",
                "name": "Feeder - NS",
                "image": "Feeder-NS.jpg",
                "brochure": "Feeder-NS.pdf"
            },
            {
                "key": "feeder-ss",
                "name": "Feeder - SS",
                "image": "Feeder-SS.jpg",
                "brochure": "Feeder-SS.pdf"
            }
        ]
    },
    "folder": {
        "total": 8,
        "key": "folder",
        "name": "Folder",
        "products": [
            {
                "key": "folder-classic",
                "name": "Folder Classic",
                "youtube": {
                    "src": "https://www.youtube.com/embed/Oz09xJ53Nbk"
                },
                "image": "Folder Classic.jpg",
                "brochure": "Folder Classic.pdf"
            },
            {
                "key": "folder-2-lanes",
                "name": "Folder - 2 lanes",
                "youtube": {
                    "src": "https://www.youtube.com/embed/IE7pLRC9E3U"
                },
                "image": "Folder-2 Lanes.jpg",
                "brochure": "Folder-2 Lanes.pdf"
            },
            {
                "key": "folder-3-stackers",
                "name": "Folder + 3 stackers",
                "image": "Folder +3 Stackers.jpg",
                "brochure": "Folder +3 Stackers.pdf"
            },
            {
                "key": "folder+stackers",
                "name": "Folder + stackers",
                "youtube": {
                    "src": "https://www.youtube.com/embed/221nI796yKs"
                },
                "image": "Folder +Stackers.jpg",
                "brochure": "Folder +Stackers.pdf"
            },
            {
                "key": "folder-stacker-small-pieces",
                "name": "Folder + Stacker (Small Pieces)",
                "youtube": {
                    "src": "https://www.youtube.com/embed/UocKD_OsSrA"
                },
                "image": "Folder +Stacker (Small pieces).jpg",
                "brochure": "Folder +Stacker (Small pieces).pdf"
            },
            {
                "key": "folder-stacker-large-small-pieces",
                "name": "Folder + stacker (large & small pieces)",
                "youtube": {
                    "src": "https://www.youtube.com/embed/kl7yZcuHKt0"
                },
                "image": "Folder +Stacker (Large and Small pieces).jpg",
                "brochure": "Folder +Stacker (Large and Small pieces).pdf"
            },
            {
                "key": "airline-blanket-folder",
                "name": "Airline Blanket Folder",
                "image": "Airline Blanket Folder.jpg",
                "youtube": {
                    "src": "https://www.youtube.com/embed/3L-2M2TZHzQ"
                },
                "brochure": "Airline Blanket Folder.pdf"
            },
            {
                "key": "towel-folder",
                "name": "Towel folder",
                "youtube": {
                    "src": "https://www.youtube.com/embed/jt0HCFsNc7U"
                },
                "image": "Towel Folder.jpg",
                "brochure": "Towel Folder.pdf"
            }
        ]
    },
    "ironer": {
        "key": "ironer",
        "name": "Ironer",
        "products": [
            {
                "key": "chest-ironer",
                "name": "Chest Ironer",
                "youtube": {
                    "src": "https://www.youtube.com/embed/WAx8Cn2dkoQ"
                },
                "image": "Chest Ironer.jpg",
                "brochure": "Chest Ironer.pdf"
            }
        ]
    },
    "scanner": {
        "key": "scanner",
        "name": "Scanner",
        "products": [
            {
                "key": "scanner",
                "name": "Scanner",
                "youtube": {
                    "src": "https://www.youtube.com/embed/hEUxOxEeVIw"
                },
                "image": "Scanner.png",
                "brochure": "Scanner.pdf"
            }
        ]
    },
    "separation": {
        "key": "separation",
        "name": "Linen Separator",
        "products": [
            {
                "key": "linen-separator",
                "name": "Linen Separator",
                "image": "Linen Separator.jpg",
                "brochure": "Linen Separator.pdf"
            }
        ]
    },
    "conveyor": {
        "key": "conveyor",
        "name": "Conveyor",
        "products": [
            {
                "key": "conveyor",
                "name": "Conveyor",
                "image": "Conveyor.jpg",
                "brochure": "Conveyor.pdf"
            }
        ]
    },
    "auxiliaries": {
        "key": "auxiliaries",
        "name": "Auxiliaries",
        "total": 2,
        "products": [
            {
                "key": "blower",
                "name": "Blower",
                "image": "Blower.jpg",
                "brochure": "Blower.pdf"
            },
            {
                "key": "lift+shuttle-vehicle",
                "name": "Lift + Shuttle Vehicle",
                "youtube": {
                    "src": "https://www.youtube.com/embed/BWcPTqBfIN4"
                },
                "image": "Lift +Shuttle Vehicle.png",
                "brochure": "Lift +Shuttle Vehicle.pdf"
            }
        ]
    }
}

window.onload = (event) => {
    // get param
    var page = location.pathname.replace(/\//g, '');
    var urlParam = location.href.split("?")[1]; //A string of all parameters in the URL
    if (urlParam != null && urlParam != undefined) {
        console.log("param is: " + urlParam);
        var urlParams = urlParam.split("&"); //Turns the string into an array of parameters
        var productName = "";
        var categoryName = "";
        urlParams.forEach((param, index) => {
            console.log(param);
            var key = param.split("=")[0];
            var value = param.split("=")[1];
            if (key == "c") categoryName = value;
            if (key == "p") productName = value;
        });
        console.log("selected product name is: " + productName);
        console.log(page);
        if (page == "products") {
            updateProduct(productName);
        } else if (page == "product-details") {
            updateProductDetail(categoryName, productName);
        }
    } else {
        console.log("no param")
    }
};

function updateProduct(product) {
    console.log(product)
    // find object in product list
    var p = productList[product];
    if (p != null && p != undefined) {
        // change title
        console.log(p);
        var categorykey = p["key"];
        var categoryName = p["name"];
        document.getElementById("product-name").innerText = categoryName;

        var productListDiv = document.getElementById("product-list");
        // for each product in this categroy, build div and display on page
        var products = p.products;

        // put in product-list
        if (products != null && products != undefined) {
            for (var product of products) {
                console.log(product);

                var divProductBlock = document.createElement('div');
                divProductBlock.className = 'col-lg-6 col-md-12 product-block';

                var aToAnotherPage = document.createElement('a');
                aToAnotherPage.href = '/product-details?c=' + categorykey + '&p=' + product['key'];
                divProductBlock.appendChild(aToAnotherPage);

                var divProductBlockItem = document.createElement('div');
                divProductBlockItem.className = 'product-block-item';
                aToAnotherPage.appendChild(divProductBlockItem);

                var imgProductImage = document.createElement('img');
                imgProductImage.className = 'product-image';
                imgProductImage.src = './files/products/' + categorykey + '/' + product["image"];
                divProductBlockItem.appendChild(imgProductImage);

                var pItemName = document.createElement('p');
                pItemName.innerText = product['name'];
                divProductBlockItem.appendChild(pItemName);

                divProductBlock.addEventListener("click", function (e) {
                    console.log("div clicked");
                    console.log(e);

                });

                productListDiv.appendChild(divProductBlock);
            }
        } else {
            var divCommingSoon = document.createElement('p');
            divCommingSoon.innerText = 'Coming soon...';
            productListDiv.appendChild(divCommingSoon);
        }
    }
}

function updateProductDetail(productCategory, productKey) {
    console.log("z");
    console.log(productCategory);
    var products = productList[productCategory]?.products;
    if (products != null && products != undefined) {

        var product = products.find(p => {
            return p.key === productKey
        });

        console.log(product);
        var productDetailsDiv = document.getElementById("product-details");
        if (product != undefined && product != null) {
            // change title
            document.getElementById("product-name").innerText = product["name"];
    
            // change image
            var divImage = document.createElement('div');
            divImage.className = 'main-image col-lg-6 col-md-12';
            var imgProductImage = document.createElement('img');
            imgProductImage.src = './files/products/' + productCategory + '/' + product["image"];
            divImage.appendChild(imgProductImage);
            productDetailsDiv.appendChild(divImage);

            // change video
            var productDetailsVideo = product["youtube"];
            if (productDetailsVideo != undefined && productDetailsVideo != null) {
                var videoUrl = productDetailsVideo["src"];
                if (videoUrl != undefined && videoUrl != null) {
                    var divVideo = document.createElement('div');
                    divVideo.className = 'main-video col-lg-6 col-md-12';
                    var iframeVideo = document.createElement('iframe');
                    iframeVideo.src = videoUrl;
                    iframeVideo.width = 1200;
                    iframeVideo.height = 480;
                    divVideo.appendChild(iframeVideo);
                    productDetailsDiv.appendChild(divVideo);
                }
            }

            // change brochure
            var productDetailsBrochure = product["brochure"];
            if (productDetailsBrochure != undefined && productDetailsBrochure != null) {
                var brochureDiv = document.getElementsByClassName("brochure")[0];

                var h3Brochure = document.createElement('h3');
                h3Brochure.innerText = "Brochure";
                brochureDiv.appendChild(h3Brochure);

                var divBrochure = document.createElement('a');
                divBrochure.download = productDetailsBrochure;
                divBrochure.href = './files/products/' + productCategory + '/' + productDetailsBrochure ;
                divBrochure.innerHTML = '<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M26.25 18.75V23.75C26.25 24.413 25.9866 25.0489 25.5178 25.5178C25.0489 25.9866 24.413 26.25 23.75 26.25H6.25C5.58696 26.25 4.95107 25.9866 4.48223 25.5178C4.01339 25.0489 3.75 24.413 3.75 23.75V18.75" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.75 12.5L15 18.75L21.25 12.5" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 18.75V3.75" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
                brochureDiv.appendChild(divBrochure);
            }
        }
    }
}