"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

const SculptureScene = dynamic(() => import("../SculptureScene"), { ssr: false });

function Arrow() { return <span aria-hidden="true">↗</span>; }

type Activity = { title: string; subject: string; image?: string; modalImage?: string; url?: string; reflection?: string };
type Subject = { id: string; code: string; name: string; description: string; activities: Activity[] };

const subjects: Subject[] = [
  {
    id: "natureza", code: "CN", name: "Ciências da Natureza", description: "Biologia, Química e Física observadas como sistemas em transformação.",
    activities: [
      { title: "Meme: Evolucionismo", subject: "Educação Científica Contemporânea", image: "/activities/evolucionismo.png", url: "/activities/evolucionismo.png", reflection: "Uma representação visual das teorias evolutivas por meio do humor digital, explorando seleção natural e adaptação das espécies." },
      { title: "Combustíveis Fósseis & Poder Calorífico", subject: "Análise Termoquímica", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200", url: "https://canva.link/DAHE8hNJVcQ/xuWPmiQMAqVdrltf6kQhvQ/view", reflection: "Uma investigação sobre rendimento energético, infraestrutura e os fatores que ainda sustentam o uso de combustíveis fósseis." },
      { title: "Eletricidade por Atrito", subject: "Laboratório de Física Experimental", image: "https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=1200", reflection: "Relatório experimental sobre indução, polarização eletrostática e a relação entre diferentes materiais na série triboelétrica." },
      { title: "Portfólio Digital de Eletroquímica", subject: "Química Experimental", image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200", url: "https://fernandorateke.github.io/Natureza/", reflection: "⚠️ Em desenvolvimento — vídeo em edição. Experimento laboratorial focado em reações de oxirredução e princípios de Eletroquímica." },
    ],
  },
  {
    id: "humanas", code: "CH", name: "Ciências Humanas", description: "História, território e sociedade interpretados por diferentes perspectivas.",
    activities: [
      { title: "Imperialismo — China", subject: "Século XIX e Industrialização", image: "/activities/imperialismo.png", url: "https://docs.google.com/document/d/1Q7P5cZxNsy_MuxwBBc5WnIbka_TOHeN1ok1CZg7kF3c/edit?usp=sharing", reflection: "Análise das tensões geopolíticas e das narrativas construídas pelas potências durante a expansão imperialista." },
      { title: "A Grande Guerra", subject: "Narrativa histórica e propaganda", image: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200", url: "https://canva.link/DAHFb_bP_rI/VE3XPBFp5q2uxLqnJMAD_w/view", reflection: "Um exercício de escrita jornalística situado em 1916 para compreender como propaganda e seleção de fatos moldam a percepção pública." },
      { title: "Tropicália — Sociedade e Política", subject: "História & Sociedade", image: "/imagens/tropicalia_card.jpg", url: "https://www.canva.com/design/DAHSQ9Eo1-U/JfVR-UMWZ71Tow7Rr62k-g/view?utm_content=DAHSQ9Eo1-U&utm_campaign=designshare&utm_medium=embeds&utm_source=link", reflection: "Apresentação oral individual sobre a Tropicália como movimento cultural, social e político no Brasil dos anos 1960–70, relacionando lutas sociais, políticas públicas culturais e o papel das instituições artísticas como agentes de resistência." },
    ],
  },
  {
    id: "linguagens", code: "LG", name: "Linguagens", description: "Literatura, comunicação, arte e construção de narrativas.",
    activities: [
      { title: "A Paixão Segundo G.H.", subject: "Literatura existencialista", image: "https://img.youtube.com/vi/66sZjfvacSE/maxresdefault.jpg", url: "https://www.youtube.com/watch?v=66sZjfvacSE", reflection: "Ensaio audiovisual sobre a obra de Clarice Lispector, traduzindo metáforas e conflitos do sujeito para uma linguagem visual." },
      { title: "Naturalismo — Jogo Educativo", subject: "Literatura brasileira", image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200", url: "https://canva.link/DAHCP-I0tb4/QMuWlVxaAfVN6jZV8QnEeg/view", reflection: "Conceitos do Naturalismo transformados em desafios interativos para relacionar literatura, história e denúncia social." },
      { title: "Surrealismo", subject: "Produção artística", image: "/activities/surrealismo.jpg", reflection: "Registro visual de uma atividade autoral sobre linguagem surrealista e composição de imagens." },
      { title: "Videomanifesto — Produção Individual", subject: "Produção Audiovisual", image: "/imagens/videomanifesto_card.jpg", reflection: "⚠️ Em desenvolvimento — vídeo em edição. Videomanifesto autoral abordando a situação enfrentada pela população na Ilha do Marajó e no Ceará com facções expulsando cidades de suas casas, utilizando o filme 'Manas' como apoio." },
      { title: "Desempenho no Red1000", subject: "Redação & Língua Portuguesa", image: "/imagens/red1000_nota.png", modalImage: "/imagens/red1000_criterios.png", reflection: "Produção de redação dissertativo-argumentativa avaliada na plataforma Red1000, alcançando a pontuação de 960/1000 com 200 pontos em quatro eixos fundamentais." },
    ],
  },
  {
    id: "matematica", code: "MT", name: "Matemática", description: "Probabilidade, estatística e raciocínio transformados em decisões.",
    activities: [
      { title: "Quebrando a Banca", subject: "Probabilidade e contagem", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200", reflection: "Análise de probabilidade condicional e expectativa matemática a partir das estratégias apresentadas no filme." },
      { title: "Hollow Depths", subject: "Game design e estatística", image: "/activities/hollow-depths.png", url: "https://game-nauy.onrender.com/", reflection: "Um RPG de turno em que exploração e combate são orientados por probabilidade, cartas e leitura de variáveis." },
    ],
  },
  {
    id: "modelagem", code: "MS", name: "Modelagem de Sistemas", description: "Estruturas, fluxos e relações antes da implementação.",
    activities: [{ title: "Hackathon: Cibersegurança", subject: "UML, fluxo de dados e segurança", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200", url: "https://canva.link/DAHG7DnrZ6c/VvuKwrdyThZjsrDJEObxZA/view", reflection: "Modelagem de uma proposta integrada de segurança, banco de dados e dispositivos conectados sob pressão de tempo." }],
  },
  {
    id: "desenvolvimento", code: "DS", name: "Desenvolvimento de Sistemas", description: "Código, integração e construção de aplicações funcionais.",
    activities: [
      { title: "AcousticBuild — Plataforma de Previsões Acústicas", subject: "Desenvolvimento Web Full-Stack", image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200", url: "https://canva.link/DAHOEXsnSiU/twMjG-Quo00LmeoNuiPzQg/view", reflection: "Plataforma preditiva full-stack com React e FastAPI para antecipar níveis de ruído em edificações." },
    ],
  },
  {
    id: "programacao-aplicativos", code: "PA", name: "Programação de Aplicativos", description: "Desenvolvimento de aplicações móveis e interfaces modernas integradas.",
    activities: [
      { title: "AcousticBuild — Plataforma de Previsões Acústicas", subject: "Desenvolvimento Web & Aplicativos", image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200", url: "https://canva.link/DAHOEXsnSiU/twMjG-Quo00LmeoNuiPzQg/view", reflection: "Plataforma preditiva full-stack com React e FastAPI para antecipar níveis de ruído em edificações." },
    ],
  },
  {
    id: "iot", code: "IO", name: "Internet das Coisas", description: "Dispositivos, dados e segurança conectando o físico ao digital.",
    activities: [
      { title: "Hackathon: Cibersegurança", subject: "IoT e proteção de dispositivos", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200", url: "https://canva.link/DAHG7DnrZ6c/VvuKwrdyThZjsrDJEObxZA/view", reflection: "Proposta de camadas de proteção e criptografia para dispositivos integrados na ponta." },
      { title: "Atividade 2 — Semáforo", subject: "Automação & Lógica de Controle", image: "/imagens/semaforo_prototipo.jpg", url: "https://canva.link/xt8l4950oajtohy", reflection: "Montagem e programação de sistema de sinalização de semáforo com três LEDs e temporização precisa." },
    ],
  },
  {
    id: "banco", code: "BD", name: "Banco de Dados", description: "Informação organizada para permanecer segura, coerente e acessível.",
    activities: [{ title: "Hackathon: Cibersegurança", subject: "Dados, validação e proteção", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200", url: "https://canva.link/DAHG7DnrZ6c/VvuKwrdyThZjsrDJEObxZA/view", reflection: "Estruturação de esquemas e proteção contra ataques e injeções SQL dentro de uma solução multidisciplinar." }],
  },
];

export default function ArquivoPage() {
  const [activeSubject, setActiveSubject] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const onReady = useCallback(() => {}, []);

  return (
    <main className="sub-page">
      <SculptureScene mode="subjects" onReady={onReady} />
      <div className="noise" aria-hidden="true" />

      <header className="sub-header">
        <Link href="/antigo#archive" className="back-link">← VOLTAR</Link>
        <span className="sub-title">ARQUIVO DE ESTUDOS</span>
      </header>

      <section className="sub-hero">
        <div className="sub-hero-inner reveal-immediate">
          <span className="kicker">03 / ARQUIVO TRIDIMENSIONAL</span>
          <h1>Conhecimento<br />em <em>movimento.</em></h1>
          <p>Gavetas e registros organizados por área — sem separar pensamento técnico de repertório humano.</p>
        </div>
      </section>

      <section className="subjects-section-page">
        <div className="subject-index reveal-immediate">
          <div className="subject-list" role="tablist">
            {subjects.map((s, i) => (
              <button key={s.id} onClick={() => setActiveSubject(i)} className={activeSubject === i ? "active" : ""} role="tab" aria-selected={activeSubject === i}>
                <small>{s.code}</small><span>{s.name}</span><b>{s.activities.length.toString().padStart(2, "0")}</b>
              </button>
            ))}
          </div>
          <div className="subject-view" role="tabpanel">
            <div className="subject-view-heading">
              <span>{subjects[activeSubject].code} / ÁREA</span>
              <h3>{subjects[activeSubject].name}</h3>
              <p>{subjects[activeSubject].description}</p>
            </div>
            <div className="activity-list">
              {subjects[activeSubject].activities.map((a, i) => (
                <button key={`${a.title}-${i}`} onClick={() => setSelectedActivity(a)}>
                  <small>0{i + 1}</small>
                  <span><strong>{a.title}</strong><em>{a.subject}</em></span>
                  <Arrow />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Activity modal */}
      <div className={selectedActivity ? "activity-modal open" : "activity-modal"} role="dialog" aria-modal="true" aria-hidden={!selectedActivity}>
        <button className="modal-close" onClick={() => setSelectedActivity(null)}>FECHAR ×</button>
        {selectedActivity && (
          <div className="activity-modal-content">
            <div className="activity-media">
              {(selectedActivity.modalImage || selectedActivity.image) ? (
                <img src={selectedActivity.modalImage || selectedActivity.image} alt={selectedActivity.title} />
              ) : (
                <div className="activity-placeholder">FR / REGISTRO</div>
              )}
            </div>
            <div className="activity-copy">
              <span>ARQUIVO DE ESTUDOS</span>
              <h2>{selectedActivity.title}</h2>
              <small>{selectedActivity.subject}</small>
              {selectedActivity.reflection ? <p>{selectedActivity.reflection}</p> : <p className="muted">Reflexão em desenvolvimento.</p>}
              {selectedActivity.url && <a href={selectedActivity.url} target="_blank" rel="noreferrer">ABRIR REGISTRO COMPLETO <Arrow /></a>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
