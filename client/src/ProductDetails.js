import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const PRODUCT_LIST = {
    feeder: {
        total: 5,
        key: 'feeder',
        name: 'Feeder',
        products: [
            {
                key: 'feeder-classic',
                name: 'Feeder Classic',
                youtube: {
                    src: 'https://www.youtube.com/embed/R-VC-olFN-A',
                },
                image: 'Feeder Classic.jpg',
                brochure: 'Feeder Classic.pdf',
            },
            {
                key: 'feeder-2-lanes',
                name: 'Feeder - 2 Lanes',
                youtube: {
                    src: 'https://www.youtube.com/embed/_yiJLdMJcWU',
                },
                image: 'Feeder-2 Lanes.jpg',
                brochure: 'Feeder-2 Lanes.pdf',
            },
            {
                key: 'remote-preparation-buffer-system',
                name: 'Remote preparation and buffer System',
                youtube: {
                    src: 'https://www.youtube.com/embed/EfZ6vuB9ZoA',
                },
                image: 'Remote Preparation and Buffer System.jpg',
                brochure: 'Remote Preparation and Buffer System.pdf',
            },
            {
                key: 'feeder-ns',
                name: 'Feeder - NS',
                image: 'Feeder-NS.jpg',
                brochure: 'Feeder-NS.pdf',
            },
            {
                key: 'feeder-ss',
                name: 'Feeder - SS',
                image: 'Feeder-SS.jpg',
                brochure: 'Feeder-SS.pdf',
            },
        ],
    },
    folder: {
        total: 8,
        key: 'folder',
        name: 'Folder',
        products: [
            {
                key: 'folder-classic',
                name: 'Folder Classic',
                youtube: {
                    src: 'https://www.youtube.com/embed/Oz09xJ53Nbk',
                },
                image: 'Folder Classic.jpg',
                brochure: 'Folder Classic.pdf',
            },
            {
                key: 'folder-2-lanes',
                name: 'Folder - 2 lanes',
                youtube: {
                    src: 'https://www.youtube.com/embed/IE7pLRC9E3U',
                },
                image: 'Folder-2 Lanes.jpg',
                brochure: 'Folder-2 Lanes.pdf',
            },
            {
                key: 'folder-3-stackers',
                name: 'Folder + 3 stackers',
                image: 'Folder +3 Stackers.jpg',
                brochure: 'Folder +3 Stackers.pdf',
            },
            {
                key: 'folder+stackers',
                name: 'Folder + stackers',
                youtube: {
                    src: 'https://www.youtube.com/embed/221nI796yKs',
                },
                image: 'Folder +Stackers.jpg',
                brochure: 'Folder +Stackers.pdf',
            },
            {
                key: 'folder-stacker-small-pieces',
                name: 'Folder + Stacker (Small Pieces)',
                youtube: {
                    src: 'https://www.youtube.com/embed/UocKD_OsSrA',
                },
                image: 'Folder +Stacker (Small pieces).jpg',
                brochure: 'Folder +Stacker (Small pieces).pdf',
            },
            {
                key: 'folder-stacker-large-small-pieces',
                name: 'Folder + stacker (large & small pieces)',
                youtube: {
                    src: 'https://www.youtube.com/embed/kl7yZcuHKt0',
                },
                image: 'Folder +Stacker (Large and Small pieces).jpg',
                brochure: 'Folder +Stacker (Large and Small pieces).pdf',
            },
            {
                key: 'airline-blanket-folder',
                name: 'Airline Blanket Folder',
                image: 'Airline Blanket Folder.jpg',
                youtube: {
                    src: 'https://www.youtube.com/embed/3L-2M2TZHzQ',
                },
                brochure: 'Airline Blanket Folder.pdf',
            },
            {
                key: 'towel-folder',
                name: 'Towel folder',
                youtube: {
                    src: 'https://www.youtube.com/embed/jt0HCFsNc7U',
                },
                image: 'Towel Folder.jpg',
                brochure: 'Towel Folder.pdf',
            },
        ],
    },
    ironer: {
        key: 'ironer',
        name: 'Ironer',
        products: [
            {
                key: 'chest-ironer',
                name: 'Chest Ironer',
                youtube: {
                    src: 'https://www.youtube.com/embed/WAx8Cn2dkoQ',
                },
                image: 'Chest Ironer.jpg',
                brochure: 'Chest Ironer.pdf',
            },
        ],
    },
    scanner: {
        key: 'scanner',
        name: 'Scanner',
        products: [
            {
                key: 'scanner',
                name: 'Scanner',
                youtube: {
                    src: 'https://www.youtube.com/embed/hEUxOxEeVIw',
                },
                image: 'Scanner.png',
                brochure: 'Scanner.pdf',
            },
        ],
    },
    separation: {
        key: 'separation',
        name: 'Linen Separator',
        products: [
            {
                key: 'linen-separator',
                name: 'Linen Separator',
                image: 'Linen Separator.jpg',
                brochure: 'Linen Separator.pdf',
            },
        ],
    },
    conveyor: {
        key: 'conveyor',
        name: 'Conveyor',
        products: [
            {
                key: 'conveyor',
                name: 'Conveyor',
                image: 'Conveyor.jpg',
                brochure: 'Conveyor.pdf',
            },
        ],
    },
    auxiliaries: {
        key: 'auxiliaries',
        name: 'Auxiliaries',
        total: 2,
        products: [
            {
                key: 'blower',
                name: 'Blower',
                image: 'Blower.jpg',
                brochure: 'Blower.pdf',
            },
            {
                key: 'lift+shuttle-vehicle',
                name: 'Lift + Shuttle Vehicle',
                youtube: {
                    src: 'https://www.youtube.com/embed/BWcPTqBfIN4',
                },
                image: 'Lift +Shuttle Vehicle.png',
                brochure: 'Lift +Shuttle Vehicle.pdf',
            },
        ],
    },
};

const ProductDetails = () => {
    const location = useLocation();

    const selectedProduct = useMemo(() => {
        const searchParams = new URLSearchParams(location.search);
        const categoryKey = searchParams.get('c');
        const productKey = searchParams.get('p');

        if (!categoryKey || !productKey) {
            return null;
        }

        const category = PRODUCT_LIST[categoryKey];
        const product = category?.products?.find((item) => item.key === productKey);

        if (!category || !product) {
            return null;
        }

        return {
            categoryKey,
            product,
        };
    }, [location.search]);

    return (
        <div className="main-content">
            <nav className="navbar navbar-expand-lg bg-primary fixed-top">
                <div className="navbar-brand logo">
                    <a href="/"><img src={`${process.env.PUBLIC_URL}/files/innoway.png`} alt="Innoway Logo" /></a>
                </div>
                <button id="navbar-toggler" className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-collapse" aria-controls="navbar-collapse" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbar-collapse">
                    <ul className="navbar-nav me-auto nav-fill w-100">
                        <li className="nav-item">
                            <a className="nav-link" href="/about">About Us</a>
                        </li>
                        <li id="myDropdown" className="nav-item dropdown">
                            <a className="nav-link active dropdown-toggle" aria-current="page" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                Products
                            </a>
                            <ul id="list" className="dropdown-menu">
                                <li>
                                    <a className="dropdown-item" data-product-key="feeder" href="/products?p=feeder">Feeder</a>
                                </li>
                                <li>
                                    <a className="dropdown-item" data-product-key="folder" href="/products?p=folder">Folder</a>
                                </li>
                                <li>
                                    <a className="dropdown-item" data-product-key="ironer" href="/products?p=ironer">Ironer</a>
                                </li>
                                <li>
                                    <a className="dropdown-item" data-product-key="scanner" href="/products?p=scanner">Scanner</a>
                                </li>
                                <li>
                                    <a className="dropdown-item" data-product-key="separation" href="/products?p=separation">Linen Separator</a>
                                </li>
                                <li>
                                    <a className="dropdown-item" data-product-key="conveyor" href="/products?p=conveyor">Conveyor</a>
                                </li>
                                <li>
                                    <a className="dropdown-item" data-product-key="auxiliaries" href="/products?p=auxiliaries">Auxiliaries</a>
                                </li>
                            </ul>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/news">News</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/Contact">Contact</a>
                        </li>
                    </ul>

                    <ul className="navbar-nav">
                        <li className="nav-social-item">
                            <a target="_blank" href="https://www.youtube.com/@innowayfolder" rel="noreferrer">
                                <img src={`${process.env.PUBLIC_URL}/files/youtube-logo.png`} alt="YouTube Logo" />
                            </a>
                        </li>
                        <li className="nav-social-item">
                            <a target="_blank" href="https://www.linkedin.com/company/innoway-ltd/" rel="noreferrer">
                                <img src={`${process.env.PUBLIC_URL}/files/linkedin-logo.svg`} alt="LinkedIn Logo" />
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>

            <div className="container">
                <div className="main-header">
                    <h1 id="product-name">{selectedProduct?.product?.name || 'Products'}</h1>
                </div>
                <div className="row" id="product-details">
                    {selectedProduct && (
                        <>
                            <div className="main-image col-lg-6 col-md-12">
                                <img
                                    src={`${process.env.PUBLIC_URL}/files/products/${selectedProduct.categoryKey}/${selectedProduct.product.image}`}
                                    alt={selectedProduct.product.name}
                                />
                            </div>

                            {selectedProduct.product.youtube?.src && (
                                <div className="main-video col-lg-6 col-md-12">
                                    <iframe
                                        src={selectedProduct.product.youtube.src}
                                        width="1200"
                                        height="480"
                                        title={`${selectedProduct.product.name} video`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="row">
                    <div className="brochure">
                        {selectedProduct?.product?.brochure && (
                            <>
                                <h3>Brochure</h3>
                                <a
                                    download={selectedProduct.product.brochure}
                                    href={`${process.env.PUBLIC_URL}/files/products/${selectedProduct.categoryKey}/${selectedProduct.product.brochure}`}
                                    aria-label={`Download brochure for ${selectedProduct.product.name}`}
                                >
                                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M26.25 18.75V23.75C26.25 24.413 25.9866 25.0489 25.5178 25.5178C25.0489 25.9866 24.413 26.25 23.75 26.25H6.25C5.58696 26.25 4.95107 25.9866 4.48223 25.5178C4.01339 25.0489 3.75 24.413 3.75 23.75V18.75" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M8.75 12.5L15 18.75L21.25 12.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M15 18.75V3.75" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;