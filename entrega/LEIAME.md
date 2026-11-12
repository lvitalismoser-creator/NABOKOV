# Oscorp - Diagramas ER e UML

Fontes PlantUML em `fontes/`:
- `er.puml` - Diagrama ER (tabelas contas, permissoes, conta_permissoes, auditorias_acesso)
- `uml_model.puml` - Classes do pacote model (herança Individuo > Conta > Diretor/Colaborador)
- `uml_camadas.puml` - Controller, service, repository, dto, exception, config

Para gerar imagens: `java -jar plantuml.jar -tpng fontes/*.puml` (requer Graphviz),
ou cole o conteúdo em https://www.plantuml.com/plantuml.
