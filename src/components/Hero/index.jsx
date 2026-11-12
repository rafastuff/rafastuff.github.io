'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { RevealLines } from '../../common/Reveal';
import styles from './style.module.scss';
import LogoMaterial3D from '../LogoMaterial3D';
import RotatingArea from './RotatingArea';

// Áreas em que o Rafa trabalha, uma por case study. A primeira (Design Systems) é a de
// repouso: o hero abre e acaba nela.
const AREAS = ['Design Systems', 'Acessibilidade', 'Self-checkout', 'Landing pages'];

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // Ao sair do ecrã, o título sobe um pouco mais devagar e desvanece.
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className={styles.hero}>
      {/* o novo Rv. em prata; em computadores lentos passa a imagem estática */}
      <LogoMaterial3D variant="prata" className={styles.logo3d} />
      <motion.div style={{ y, opacity }} className={styles.titleWrap}>
        <RevealLines
          as="h1"
          onLoad
          delay={0.15}
          className={`display ${styles.title}`}
          label={`UX/UI Designer a trabalhar em ${AREAS.slice(0, -1).join(', ')} e ${AREAS[AREAS.length - 1]}`}
          lines={['UX/UI Designer', 'a trabalhar em', <RotatingArea key="area" areas={AREAS} />]}
        />
      </motion.div>

      <motion.div
        className={styles.bottom}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
      >
        <p>
          Mais de 3 anos a desenhar produtos digitais
          <br />
          para desporto, e-commerce e retalho.
        </p>
        <p className={styles.scroll}>(Scroll)</p>
      </motion.div>
    </section>
  );
}
