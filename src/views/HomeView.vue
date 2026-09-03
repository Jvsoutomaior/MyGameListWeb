<template>
  <main class="home-page">
    <section class="hero">
      <p class="eyebrow">Seu histórico de jogos, em um só lugar</p>
      <h1>Registre cada mundo que você explorou.</h1>
      <p class="hero-copy">
        Organize o que está jogando, guarde suas notas e descubra as listas de outras pessoas.
      </p>
      <div class="hero-actions">
        <RouterLink class="primary-button" to="/register">Criar minha lista</RouterLink>
        <RouterLink class="secondary-button" to="/login">Já tenho uma conta</RouterLink>
      </div>
    </section>

    <section class="feature-grid" aria-label="Recursos do MyGameList">
      <article>
        <span>01</span>
        <h2>Organize</h2>
        <p>Separe jogos concluídos, em andamento, pausados e os que ainda quer jogar.</p>
      </article>
      <article>
        <span>02</span>
        <h2>Avalie</h2>
        <p>Dê notas e registre comentários para lembrar como foi cada experiência.</p>
      </article>
      <article>
        <span>03</span>
        <h2>Compartilhe</h2>
        <p>Visite perfis públicos e conheça o gosto de outros jogadores.</p>
      </article>
    </section>
  </main>
</template>
