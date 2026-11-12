'use client';
import { FadeUp } from '../../common/Reveal';
import styles from './style.module.scss';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Sobre: a foto e dois parágrafos (apresentação e interesses), com cores diferentes.
export default function About() {
  return (
    <section id="sobre" className={styles.about}>
      <FadeUp className={styles.photo}>
        <img src={`${BASE}/images/sobre/rafael.webp`} alt="Rafael Vaz, de óculos escuros, em frente a uma parede de azulejos verdes" width="920" height="1150" loading="lazy" decoding="async" />
      </FadeUp>

      <div className={styles.text}>
        <h2 className="label">Sobre</h2>
        <FadeUp as="p" className={styles.lede}>
          Olá! Sou o Rafa, moro em Lisboa e estou atualmente na Monday.
          <br />
          Fascinado por design systems, gosto de perceber o que funciona, o que falha, porquê e
          como consigo encontrar novos formatos para o projeto. Nestes quase 4 anos, já trabalhei
          com marcas como a Federação Portuguesa de Futebol, Pingo Doce, Perfumes &amp; Companhia,
          EDP, Gallo e muitas outras.
        </FadeUp>
        <FadeUp as="p" className={styles.body}>
          Fora do design, é provável encontrar-me a jogar ou ler banda desenhada. Também sou
          interessado por carros, música e relógios… Todos estes interesses vão transformando
          ideias novas.
        </FadeUp>
      </div>
    </section>
  );
}
