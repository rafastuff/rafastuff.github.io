'use client';
import { useEffect, useState } from 'react';
import { RevealLines, FadeUp } from '../../common/Reveal';
import { person } from '../../data/projects';
import styles from './style.module.scss';
import Button from '../../common/Button';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

function useLisbonTime() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = () => new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }).format(new Date());
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 30000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function Contact() {
  const time = useLisbonTime();
  return (
    <section id="contacto" className={styles.contact}>
      <span className="label">Contacto</span>
      <RevealLines className={`display ${styles.title}`} lines={['Vamos', 'falar.']} />

      <FadeUp className={styles.row}>
        <Button href={`mailto:${person.email}`} tone="dark">{person.email}</Button>
        <Button href={person.linkedin} tone="dark" external>LinkedIn</Button>
        <Button href={`${BASE}/cv-rafael-vaz.pdf`} tone="dark" download="Rafael_Vaz_CV.pdf" ariaLabel="Descarregar CV (PDF, 44 KB)">
          <span className={styles.download}>
            Descarregar CV
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Button>
      </FadeUp>

      <div className={styles.footer}>
        <div>
          <span className="label">Hora em Lisboa</span>
          <span>{time}</span>
        </div>
        <div>
          <span className="label">Versão</span>
          <span>Alpha · 2026</span>
        </div>
        <div className={styles.copy}>© 2026 Rafael Vaz</div>
      </div>
    </section>
  );
}
