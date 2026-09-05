import type { Metadata } from "next";
import Link from "next/link";

/**
 * Política de privacidade.
 *
 * Escrita a partir do que o código realmente faz — cada serviço citado aqui
 * aparece no repositório —, e não de um modelo genérico. Quando a lista de
 * subprocessadores mudar, esta página muda junto, senão vira ficção.
 */

export const metadata: Metadata = {
  title: "Política de Privacidade — guardei",
  description:
    "Quais dados o guardei coleta, por que, com quem compartilha e como você pede a exclusão.",
};

/** Data da última revisão do texto. Trocar sempre que o conteúdo mudar. */
const ATUALIZADO_EM = "5 de setembro de 2026";
const CONTATO = "contato@guardei.art";

export default function PoliticaDePrivacidade() {
  return (
    <main className="legal-page">
      <div className="legal-inner">
        <Link href="/" className="legal-voltar">← voltar para o início</Link>

        <h1>Política de Privacidade</h1>
        <p className="legal-meta">Última atualização: {ATUALIZADO_EM}</p>

        <p className="legal-lead">
          O guardei existe para guardar memórias — e memória é coisa íntima. Esta
          página explica, sem rodeio, o que a gente coleta, por quê, com quem
          divide e como você apaga tudo.
        </p>

        <h2>1. Quem é responsável</h2>
        <p>
          O guardei (guardei.art) é o responsável pelo tratamento dos seus dados,
          na condição de controlador previsto na Lei Geral de Proteção de Dados
          (Lei 13.709/2018). Para qualquer assunto desta política, o contato é{" "}
          <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.
        </p>

        <h2>2. O que a gente guarda</h2>

        <h3>Da sua conta</h3>
        <p>
          Seu e-mail e seu nome, vindos do cadastro ou da conta Google que você
          usou para entrar. Também um endereço público gerado automaticamente
          (guardei.art/u/seu-nome) e, se você preencher, um nome de exibição, uma
          linha de apresentação e a cidade onde mora.
        </p>

        <h3>Das suas memórias</h3>
        <p>
          A foto que você envia, o texto que escreve, a data que escolhe e as
          coordenadas do ponto que você marca no mapa. A partir das coordenadas
          identificamos o país, para colorir o mapa. Cada memória nasce{" "}
          <strong>privada</strong>: ela só fica visível para outras pessoas se
          você marcar como pública.
        </p>

        <h3>Dos seus pedidos</h3>
        <p>
          Se você pedir um quadro de memórias impresso: nome, e-mail ou WhatsApp de contato,
          endereço completo de entrega e os dados do pedido. A arte final do
          quadro de memórias também fica guardada, porque é o arquivo que vai para a gráfica.
        </p>

        <p className="legal-nota">
          <strong>O que a gente não vê:</strong> os dados do seu cartão. O
          pagamento acontece inteiramente dentro do Stripe — o número do cartão
          nunca passa pelos nossos servidores.
        </p>

        <h2>3. Por que a gente guarda</h2>
        <ul>
          <li>Para manter sua conta e mostrar o seu mapa só para você.</li>
          <li>Para publicar o que você escolheu tornar público, e nada além disso.</li>
          <li>Para produzir e entregar o quadro de memórias que você comprou.</li>
          <li>Para enviar e-mails sobre a sua conta e os seus pedidos.</li>
          <li>Para cumprir obrigações legais, como guarda de registros fiscais.</li>
        </ul>

        <h2>4. Com quem a gente divide</h2>
        <p>
          Não vendemos os seus dados e não usamos suas memórias para publicidade.
          Dividimos apenas com os serviços necessários para o site funcionar, e
          só o mínimo que cada um precisa:
        </p>
        <ul className="legal-terceiros">
          <li><strong>Google Firebase</strong> — login, banco de dados e armazenamento das fotos e artes.</li>
          <li><strong>Vercel</strong> — hospedagem do site.</li>
          <li><strong>Stripe</strong> — processamento do pagamento e dados de cobrança.</li>
          <li><strong>Mapbox</strong> — mapas e identificação do país a partir das coordenadas.</li>
          <li><strong>Melhor Envio</strong> — cálculo de frete a partir do CEP e emissão da etiqueta.</li>
          <li><strong>Resend</strong> — envio dos e-mails de conta e de pedido.</li>
        </ul>
        <p>
          Esses serviços mantêm servidores fora do Brasil, então seus dados podem
          ser processados no exterior. A transferência acontece nos termos do
          artigo 33 da LGPD.
        </p>

        <h2>5. Os seus direitos</h2>
        <p>A LGPD garante que você pode, a qualquer momento:</p>
        <ul>
          <li>Saber quais dados seus a gente tem e pedir uma cópia.</li>
          <li>Corrigir o que estiver errado ou incompleto.</li>
          <li>Apagar suas memórias, uma a uma ou todas.</li>
          <li>Encerrar a conta e pedir a exclusão do que sobrou.</li>
          <li>Revogar o consentimento que você deu aqui.</li>
          <li>Reclamar à Autoridade Nacional de Proteção de Dados.</li>
        </ul>
        <p>
          Dentro do site você já apaga cada memória e liga ou desliga o mapa
          público quando quiser. Para exclusão da conta inteira ou uma cópia dos
          seus dados, escreva para{" "}
          <a href={`mailto:${CONTATO}`}>{CONTATO}</a> — respondemos em até 15
          dias.
        </p>

        <h2>6. Por quanto tempo</h2>
        <p>
          Suas memórias ficam enquanto a conta existir. Ao apagar uma memória,
          ela sai do banco. Dados de pedidos pagos ficam pelo prazo exigido pela
          legislação fiscal, mesmo que você encerre a conta — é obrigação legal,
          não escolha nossa.
        </p>

        <h2>7. Armazenamento no seu navegador</h2>
        <p>
          O site guarda no seu próprio navegador algumas preferências, como o
          progresso do guia de primeiros passos e quais avisos você já dispensou.
          Isso não sai do seu aparelho e não serve para rastrear você.
        </p>

        <h2>8. Menores de idade</h2>
        <p>
          O guardei não é destinado a menores de 18 anos. Se você é responsável
          por uma criança ou adolescente que criou uma conta, escreva para{" "}
          <a href={`mailto:${CONTATO}`}>{CONTATO}</a> que apagamos.
        </p>

        <h2>9. Mudanças nesta política</h2>
        <p>
          Se algo mudar, a data no topo muda junto. Alterações relevantes serão
          avisadas por e-mail antes de valer.
        </p>

        <h2>10. Falar com a gente</h2>
        <p>
          Qualquer dúvida, pedido ou reclamação sobre privacidade:{" "}
          <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.
        </p>

        <Link href="/" className="legal-voltar legal-voltar-fim">← voltar para o início</Link>
      </div>
    </main>
  );
}
