
export default function Footer() {
  return (
    <footer>
      <div className="container footer-wrapper">
        <div className="footer-grid">
          {/* Contatos */}
          <div className="footer-col">
            <h4>Contato</h4>
            <ul className="contact-list">
              <li>
                <i className="ph ph-envelope-simple"></i>
                <a href="mailto:fernando_rateke-n@estudante.sesisenai.org.br">
                  fernando_rateke-n@estudante.sesisenai.org.br
                </a>
              </li>
              <li>
                <i className="ph ph-phone"></i>
                <a href="tel:+5548991428328">(48) 9 9142-8328</a>
              </li>
            </ul>
          </div>

          {/* Redes Sociais */}
          <div className="footer-col">
            <h4>Redes Sociais</h4>
            <div className="social-links">
              <a
                href="https://github.com/fernandorateke"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
              >
                <i className="ph ph-github-logo"></i>
              </a>
              <a
                href="https://www.linkedin.com/in/fernando-rateke/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
              >
                <i className="ph ph-linkedin-logo"></i>
              </a>
              <a
                href="https://www.instagram.com/rateke.fer/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                <i className="ph ph-instagram-logo"></i>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Fernando Rateke. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
