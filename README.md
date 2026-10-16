# Monitor de Temperatura IoT

API REST em ASP.NET Core Minimal APIs para armazenar e consultar leituras de temperatura enviadas por sensores.

## Tecnologias

- C# e ASP.NET Core Minimal APIs (.NET 10 LTS)
- Entity Framework Core 10
- SQLite
- OpenAPI

## Pré-requisitos

- SDK do .NET 10

## Executar localmente

Abra o PowerShell na pasta raiz do projeto (a mesma que contém este README) e confirme que o arquivo da API está no local esperado:

```powershell
Test-Path .\MonitorTemperatura.Api\MonitorTemperatura.Api.csproj
```

O comando deve retornar `True`. Se retornar `False`, navegue até a pasta raiz do projeto antes de continuar. Depois configure uma chave local e inicie a API:

```powershell
$env:Authentication__ApiKey = "defina-uma-chave-local"
dotnet run --project .\MonitorTemperatura.Api --launch-profile https
```

A API ficará disponível em `https://localhost:7136` e `http://localhost:5098`. A interface interativa do Swagger fica em `https://localhost:7136/swagger`; o documento OpenAPI está em `/openapi/v1.json`.

O EF Core aplica as migrations pendentes ao iniciar a API e cria o arquivo `temperaturas.db` na primeira execução. O arquivo é local e não deve ser enviado ao repositório. A migration inicial foi feita para também adotar a tabela criada pelo protótipo anterior com `EnsureCreated`, sem apagar as leituras existentes.

Para criar uma migration após mudar o modelo, na raiz do projeto:

```powershell
dotnet tool restore
dotnet tool run dotnet-ef migrations add NomeDaAlteracao --project .\MonitorTemperatura.Api --startup-project .\MonitorTemperatura.Api --output-dir Infrastructure\Migrations
```

As migrations pendentes são aplicadas automaticamente na próxima inicialização.

## Autenticação

As operações `POST`, `PUT` e `DELETE` exigem o cabeçalho `X-Api-Key`. A chave é lida da configuração `Authentication:ApiKey`, que pode ser fornecida pela variável de ambiente `Authentication__ApiKey`. No Swagger, preencha o campo `X-Api-Key` da operação antes de executá-la. Leituras com `GET` são públicas.

Não coloque uma chave real no código, no README ou em arquivos versionados.

## CORS

A origem permitida é configurada em `Cors:AllowedOrigin`. O valor inicial é `http://localhost:5500`, para o painel local; em produção, substitua pelo endereço exato do frontend. A política `Frontend` permite qualquer método HTTP e qualquer cabeçalho, mas somente a origem configurada. Essa escolha atende ao painel, que consulta dados e envia operações administrativas com `X-Api-Key`. CORS controla chamadas feitas por navegadores e não substitui autenticação.

## Endpoints

| Método | Endpoint | Finalidade | Respostas principais |
| --- | --- | --- | --- |
| GET | `/api/temperaturas` | Lista até 100 leituras; aceita `sensorId`, `de` e `ate` | 200, 400 |
| GET | `/api/temperaturas/{id}` | Consulta uma leitura | 200, 404 |
| POST | `/api/temperaturas` | Registra leitura | 201, 400, 401 |
| PUT | `/api/temperaturas/{id}` | Corrige o valor de uma leitura | 200, 400, 401, 404 |
| DELETE | `/api/temperaturas/{id}` | Exclui uma leitura | 204, 401, 404 |
| GET | `/api/sensores/esp32/status` | Consulta o status de atividade recebido pela API e o horário do último POST | 200 |
| GET | `/api/sensores/esp32/status/events` | Transmite snapshots e mudanças do status monitorado por Server-Sent Events (SSE) | Fluxo `text/event-stream` |

As datas dos filtros devem estar em formato ISO 8601. A data de registro é definida pelo servidor em UTC. A API aceita valores entre -40 °C e 80 °C; `sensorId` é obrigatório no cadastro, não pode ser vazio e aceita até 60 caracteres. Campos ausentes, nulos ou inválidos retornam `400` com detalhes de validação em JSON.

O identificador monitorado é `esp32-01`, configurado em `Monitoring:SensorId`. A API registra como último sinal o recebimento de um `POST /api/temperaturas` com esse identificador e considera a comunicação inativa após cinco minutos sem novo POST. A verificação ocorre a cada cinco segundos, então a mudança aparece na próxima checagem após o limite. O endpoint `/status` informa esse estado e `/status/events` transmite atualizações por SSE. Como o firmware e o hardware estão fora do escopo desta versão, esse indicador comprova atividade recebida pela API; ele não confirma que um ESP32 físico esteja ligado. Um cadastro manual com `esp32-01` também atualiza o horário do último sinal.


## Observações do protótipo

- PUT e DELETE existem para demonstrar o CRUD exigido na atividade. Em operação real, leituras históricas normalmente não são alteradas ou removidas sem um fluxo administrativo.
- A atualização usa `PUT` porque o endpoint recebe o novo valor completo do campo editável do recurso; não há atualização parcial via `PATCH`.
- O projeto agora usa migrations do EF Core para criar e evoluir o esquema do banco.
- A validação manual cobre a API; não inclui firmware nem integração física com ESP32/DHT22, que estão fora do escopo atual.

## Frontend React

O painel React fica em `front end`. Ele consulta `GET /api/temperaturas` a cada 15 segundos, com filtros por sensor e período, resumo estatístico, gráfico, tabela paginada, exportação CSV e operações de criação, edição e exclusão. O ícone de olho em cada linha consulta `GET /api/temperaturas/{id}`. O status do ESP32 é consultado em `GET /api/sensores/esp32/status` e acompanhado em tempo real por `GET /api/sensores/esp32/status/events` (SSE).

O identificador enviado à API é `esp32-01`; na interface ele aparece com o nome amigável **ESP32 · DHT22**. O cadastro manual já preenche esse identificador por padrão. Esse nome é uma apresentação do modelo previsto no projeto: a integração física com o ESP32/DHT22 ainda não foi validada. O tema claro/escuro pode ser alternado no topo e a preferência fica salva no navegador. A API limita a listagem aos 100 registros mais recentes.

### Executar localmente

Em um terminal, inicie a API:

```powershell
$env:Authentication__ApiKey = "defina-uma-chave-local"
dotnet run --project .\MonitorTemperatura.Api --launch-profile https
```

Em outro terminal:

```powershell
Set-Location ".\front end"
npm install
npm run dev
```

Abra `http://localhost:5500`. O servidor Vite encaminha `/api` para `https://localhost:7136`. Se a API usar outro endereço, defina `API_PROXY_TARGET` no PowerShell antes de iniciar o Vite:

```powershell
$env:API_PROXY_TARGET = "https://outro-endereco-da-api:7136"
npm run dev
```

O valor padrão já aponta para `https://localhost:7136`, então essa variável só é necessária quando a API estiver em outro endereço. O navegador precisa confiar no certificado HTTPS de desenvolvimento do .NET.

Para operações administrativas, use **Acesso admin** e informe a mesma chave configurada em `Authentication__ApiKey`. Ela é mantida apenas em `sessionStorage` e removida ao encerrar o acesso ou a sessão do navegador.


## Pendências de integração

- A integração física com ESP32/DHT22 e o firmware estão fora do escopo desta entrega didática; o foco atual é a API e o frontend. O status exposto pela API representa o recebimento de POSTs com o identificador monitorado, não uma confirmação elétrica ou de rede do dispositivo físico.
- Configurar o domínio, HTTPS/proxy reverso e os endereços de produção do frontend e da API.
- A API atual não oferece `/ws`; por isso o painel atualiza os dados por HTTP a cada 15 segundos. WebSocket permanece como evolução futura.
