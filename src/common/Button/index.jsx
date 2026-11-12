'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import Magnetic from '../Magnetic';
import styles from './style.module.scss';

// Botão com o carácter da alpha: magnético e, no hover, um círculo que sobe e enche o fundo.
// `tone`: "light" (para fundos claros) ou "dark" (para fundos escuros).
// `download`: nome do ficheiro a descarregar (ex.: o CV). `ariaLabel`: nome acessível, quando é preciso mais do que o texto visível.
export default function Button({ href, children, tone = 'light', external = false, download, ariaLabel, className = '' }) {
  const circle = useRef(null);
  const tl = useRef(null);
  const leaveTimer = useRef(null);

  useEffect(() => {
    tl.current = gsap.timeline({ paused: true })
      .to(circle.current, { top: '-25%', width: '150%', duration: 0.4, ease: 'power3.in' }, 'enter')
      .to(circle.current, { top: '-150%', width: '125%', duration: 0.25 }, 'exit');
    return () => tl.current && tl.current.kill();
  }, []);

  const enter = () => {
    clearTimeout(leaveTimer.current);
    tl.current.tweenFromTo('enter', 'exit');
  };
  const leave = () => {
    leaveTimer.current = setTimeout(() => tl.current.play(), 300);
  };

  const cls = `${styles.button} ${styles[tone]} ${className}`;
  const inner = (
    <>
      <span className={styles.label}>{children}</span>
      <span ref={circle} className={styles.circle} aria-hidden="true" />
    </>
  );

  return (
    <Magnetic strength={0.25}>
      {external ? (
        <a href={href} className={cls} onMouseEnter={enter} onMouseLeave={leave} target="_blank" rel="noreferrer">{inner}</a>
      ) : download ? (
        <a href={href} className={cls} onMouseEnter={enter} onMouseLeave={leave} download={download} type="application/pdf" aria-label={ariaLabel}>{inner}</a>
      ) : href.startsWith('mailto:') ? (
        <a href={href} className={cls} onMouseEnter={enter} onMouseLeave={leave}>{inner}</a>
      ) : (
        <Link href={href} className={cls} onMouseEnter={enter} onMouseLeave={leave}>{inner}</Link>
      )}
    </Magnetic>
  );
}
