# Duda Doces

Cardápio estático para GitHub Pages. O cliente monta a sacola e envia o pedido para o WhatsApp `5517991336927`.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie estes arquivos para a branch `main`.
2. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` fará a publicação.

Todos os caminhos do site são relativos, portanto ele funciona tanto em `usuario.github.io` quanto em `usuario.github.io/nome-do-repositorio/`.

## Atualizar o cardápio

1. Abra `admin.html` no site publicado.
2. Entre com a senha inicial `duda2026`.
3. Edite os produtos e clique em **Baixar cardapio.json**.
4. No GitHub, abra `data/cardapio.json`, clique em editar, substitua o conteúdo pelo arquivo baixado e faça o commit.

Também é possível colocar novas imagens em `assets/images/` e informar no produto um caminho como `assets/images/bolo.png`. URLs HTTPS externas são aceitas.

## Segurança do admin

O GitHub Pages não possui servidor. A senha é conferida no navegador por um hash SHA-256 e serve para impedir acesso casual; alguém com conhecimento técnico ainda pode substituir o JSON diretamente se tiver acesso de escrita ao repositório. A segurança real da publicação vem das permissões da conta do GitHub.

Para trocar a senha, gere o SHA-256 da nova senha e substitua o valor de `PASSWORD_HASH` no início de `admin.js`.

No PowerShell:

```powershell
$texto = [Text.Encoding]::UTF8.GetBytes('NOVA-SENHA')
$sha = [Security.Cryptography.SHA256]::Create()
([BitConverter]::ToString($sha.ComputeHash($texto))).Replace('-', '').ToLower()
```

## Testar localmente

Como o cardápio é carregado via `fetch`, abra o projeto por um servidor HTTP local:

```powershell
python -m http.server 8080
```

Depois acesse `http://localhost:8080/`.
