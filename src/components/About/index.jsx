'use client';
import { FadeUp } from '../../common/Reveal';
import styles from './style.module.scss';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Palavras curtas (até 3 letras: o, a, e, de, na, com…) ficam presas à palavra seguinte
// com um espaço que não quebra, para nunca ficarem sozinhas no fim de uma linha.
// A última palavra também fica presa à anterior, para o parágrafo não acabar numa palavra só.
const semViuvas = (texto) => texto
  .replace(/(?<=^|\s)([\p{L}\d&]{1,3}) /gu, '$1\u00A0')
  .replace(/ (\S+)$/u, '\u00A0$1');

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
          {semViuvas(
            'Olá! Sou o Rafa, moro em Lisboa e estou atualmente na Monday. Fascinado por design systems, ' +
            'gosto de perceber o que funciona, o que falha, porquê e como consigo encontrar novos formatos ' +
            'para os projetos. Nestes quase 4 anos, já trabalhei com marcas como a Federação Portuguesa de ' +
            'Futebol, Pingo Doce, Perfumes & Companhia, EDP, Gallo e muitas outras.'
          )}
        </FadeUp>
        <FadeUp as="p" className={styles.body}>
          {semViuvas(
            'Fora do design, é provável que me encontrem a jogar ou a ler banda desenhada. Também gosto ' +
            'muito de carros, música e relógios… Todos estes interesses vão transformando ideias novas.'
          )}
        </FadeUp>
      </div>
    </section>
  );
}
