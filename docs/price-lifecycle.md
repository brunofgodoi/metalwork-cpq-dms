# Ciclo de Vida dos Preços no Orçamento

## Os 3 Campos

| Campo             | Função                                 | Preenchido                            |
| ----------------- | -------------------------------------- | ------------------------------------- |
| `estimatedPrice`  | Snapshot do valor calculado na criação | Automático ao criar itens             |
| `price`           | Valor formal enviado ao cliente        | Automático ao enviar (DRAFT→SENT)     |
| `contractedPrice` | Valor final negociado/contratado       | Automático ao aprovar (SENT→APPROVED) |

## Fluxo

```
estimatedPrice (criação)
       ↓
   [estimador ajusta itens, descontos, prazos]
       ↓
price = soma dos itens − descontos (DRAFT → SENT)
       ↓
   [cliente negocia → estimador cria revisão → ajusta]
       ↓
contractedPrice = price vigente (SENT → APPROVED)
```

## Regras

- **Usuário nunca digita preço.** As transições são automáticas.
- **Revisões** são o mecanismo de negociação: ao alterar valores de um orçamento já enviado, uma nova revisão é criada (rascunho) para ajustes.
- **`estimatedPrice`, `price`, `contractedPrice`** continuam existindo no banco para BI, mas são povoados pelo sistema.
- O **histórico real** de negociação está nas revisões + `QuoteAuditLog`.
