/**
 * Tela de Setup — Configuração inicial do tablet.
 * O operador define o nome do dispositivo e se é ENTRADA ou SAÍDA.
 */
import { dispositivosApi } from '../services/api.js';

export function renderSetup(container, onComplete) {
  container.innerHTML = `
    <div class="setup-container">
      <div class="setup-card animate-slide-up">
        <div class="setup-header">
          <h1>⚙️ Configurar Dispositivo</h1>
          <p>Defina o nome e tipo deste tablet</p>
        </div>

        <form id="setup-form">
          <div class="form-group">
            <label class="form-label" for="device-name">Nome do Dispositivo</label>
            <input
              type="text"
              id="device-name"
              class="form-input"
              placeholder="Ex: Entrada Principal, Saída Lateral"
              required
              autocomplete="off"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="device-location">Localização (opcional)</label>
            <input
              type="text"
              id="device-location"
              class="form-input"
              placeholder="Ex: Portaria Norte, Recepção"
              autocomplete="off"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Tipo do Dispositivo</label>
            <div class="type-selector">
              <label class="type-option">
                <input type="radio" name="device-type" value="ENTRADA" required />
                <div class="type-option-label type-entrada">
                  <span class="type-icon">🟢</span>
                  <span>Entrada</span>
                  <span class="type-desc">Registra chegada</span>
                </div>
              </label>
              <label class="type-option">
                <input type="radio" name="device-type" value="SAIDA" />
                <div class="type-option-label type-saida">
                  <span class="type-icon">🔴</span>
                  <span>Saída</span>
                  <span class="type-desc">Registra partida</span>
                </div>
              </label>
            </div>
          </div>

          <button type="submit" class="btn btn-primary mt-lg" id="setup-submit">
            Iniciar Monitoramento
          </button>
        </form>

        <button class="btn btn-ghost mt-lg" id="goto-dashboard" style="width:100%">
          📊 Abrir Dashboard
        </button>
      </div>
    </div>
  `;

  const form = container.querySelector('#setup-form');
  const dashboardBtn = container.querySelector('#goto-dashboard');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = container.querySelector('#device-name').value.trim();
    const localizacao = container.querySelector('#device-location').value.trim() || null;
    const tipo = container.querySelector('input[name="device-type"]:checked')?.value;

    if (!nome || !tipo) return;

    const submitBtn = container.querySelector('#setup-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrando...';

    try {
      const dispositivo = await dispositivosApi.criar({ nome, tipo, localizacao });

      // Salvar config no localStorage
      localStorage.setItem('apmonitora_device', JSON.stringify(dispositivo));

      onComplete({ page: 'monitor', device: dispositivo });
    } catch (error) {
      console.error('Erro ao registrar dispositivo:', error);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Iniciar Monitoramento';
      alert(`Erro: ${error.message}`);
    }
  });

  dashboardBtn.addEventListener('click', () => {
    onComplete({ page: 'dashboard' });
  });
}
