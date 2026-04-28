const Contact = () => {
    return (
        <div className="main-content">
            <nav className="navbar navbar-expand-lg bg-primary fixed-top">
                <div className="navbar-brand logo">
                    <a href="/"><img src={process.env.PUBLIC_URL + '/files/innoway.png'} alt="Innoway Logo" /></a>
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
                            <a className="nav-link dropdown-toggle" aria-current="page" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
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
                            <span className="nav-link active" href="#">Contact</span>
                        </li>
                    </ul>

                    <ul className="navbar-nav">
                        <li className="nav-social-item">
                            <a target="_blank" href="https://www.youtube.com/@innowayfolder">
                                <img src={process.env.PUBLIC_URL + '/files/youtube-logo.png'} alt="YouTube Logo" />
                            </a>
                        </li>
                        <li className="nav-social-item">
                            <a target="_blank" href="https://www.linkedin.com/company/innoway-ltd/">
                                <img src={process.env.PUBLIC_URL + '/files/linkedin-logo.svg'} alt="LinkedIn Logo" />
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>

            <div className="contact">
                <div className="container">
                    <h2>Innoway LTD.</h2>
                    <div className="footer-content">
                        <div className="footer-info footer-address">
                            <h5>Address</h5>
                            <span>No.5 Jingsheng South 4th St, Tongzhou District, Beijing, China</span>
                        </div>
                        <div className="footer-info footer-email">
                            <h5>Email</h5>
                            <p>info@innowaycn.com</p>
                        </div>
                        <div className="footer-social">
                            <a target="_blank" href="https://www.youtube.com/@innowayfolder"><img src={process.env.PUBLIC_URL + '/files/youtube-logo-full.png'} alt="YouTube Logo" /></a>
                            <a target="_blank" href="https://www.linkedin.com/company/innoway-ltd/"><img src={process.env.PUBLIC_URL + '/files/linkedin-logo-full.svg'} alt="LinkedIn Logo  " /></a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default Contact;