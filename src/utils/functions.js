const moment = require('moment');
require('moment-business-days');
const Horario = require('../models/Horario');

function ExcelDateToJSDate(serial) {
    var utc_days = Math.floor(serial - 25569);
    var utc_value = utc_days * 86400;
    var date_info = new Date(utc_value * 1000);

    var fractional_day = serial - Math.floor(serial) + 0.0000001;

    var total_seconds = Math.floor(86400 * fractional_day);

    var seconds = total_seconds % 60;

    total_seconds -= seconds;

    var hours = Math.floor(total_seconds / (60 * 60));
    var minutes = Math.floor(total_seconds / 60) % 60;

    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

function calcularIdade(data) {
    var now = new Date();
    var today = new Date(now.getYear(), now.getMonth(), now.getDate());

    var yearNow = now.getYear();
    var monthNow = now.getMonth();
    var dateNow = now.getDate();
    var dob = new Date(data.substring(6, 10),
        data.substring(3, 5) - 1,
        data.substring(0, 2)
    );

    var yearDob = dob.getYear();
    var monthDob = dob.getMonth();
    var dateDob = dob.getDate();
    var age = {};
    yearAge = yearNow - yearDob;

    if (monthNow >= monthDob)
        var monthAge = monthNow - monthDob;
    else {
        yearAge--;
        var monthAge = 12 + monthNow - monthDob;
    }

    if (dateNow >= dateDob)
        var dateAge = dateNow - dateDob;
    else {
        monthAge--;
        var dateAge = 31 + dateNow - dateDob;

        if (monthAge < 0) {
            monthAge = 11;
            yearAge--;
        }
    }

    age = {
        years: yearAge,
        months: monthAge,
        days: dateAge
    };
    return age.years;
}

function modeloMensagem1(nome, data1, data2) {

    let mensagem = `Prezado Sr.(a) ${nome},
    Somos da Área de Implantação da Amil e para concluirmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) precisamos confirmar alguns dados médicos.
    Por gentileza, escolha o *NÚMERO* referente a janela de horários para entrarmos em contato com o Sr.(a)
    *${data1}*
    1. Das 12:00 às 14:00
    2. Das 14:00 às 16:00
    3. Das 16:00 às 18:00
    *${data2}*
    4. Das 08:00 às 10:00
    5. Das 10:00 às 12:00
    6. Das 12:00 às 14:00
    7. Das 14:00 às 16:00
    8. Das 16:00 às 18:00
    Qual o melhor horário?
    Informamos que vamos ligar dos números 11 42404975 ou 42403554, pedimos tirar do spam para evitar bloqueio da ligação. Desde já agradecemos.
    Atenção: o preenchimento dos horários é feito em tempo real. Caso o horário informado não esteja mais disponível, apresentarei uma nova opção.
    Lembrando que em caso de menor de idade a entrevista será realizada com o responsável legal, não necessitando da presença do menor no momento da ligação.`

    return { data1, data2, mensagem }
}
function modeloMensagem2(nome, data1, data2) {

    let mensagem = `Prezado Sr.(a) ${nome},
    Somos da Área de Implantação da Amil e para concluirmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) precisamos confirmar alguns dados médicos.
    Por gentileza, escolha o *NÚMERO* referente a janela de horários para entrarmos em contato com o Sr.(a)
    *${data1}*
    1. Das 08:00 às 10:00
    2. Das 10:00 às 12:00
    3. Das 12:00 às 14:00
    4. Das 14:00 às 16:00
    5. Das 16:00 às 18:00
    *${data2}*
    6. Das 08:00 às 10:00
    7. Das 10:00 às 12:00
    8. Das 12:00 às 14:00
    9. Das 14:00 às 16:00
    10. Das 16:00 às 18:00
    Qual o melhor horário?
    Informamos que vamos ligar dos números 11 42404975 ou 42403554, pedimos tirar do spam para evitar bloqueio da ligação. Desde já agradecemos.
    Atenção: o preenchimento dos horários é feito em tempo real. Caso o horário informado não esteja mais disponível, apresentarei uma nova opção.
    Lembrando que em caso de menor de idade a entrevista será realizada com o responsável legal, não necessitando da presença do menor no momento da ligação.`

    return { data1, data2, mensagem }
}



function calcularDiasUteis(dataInicio, dataFim, feriados) {
    let diasUteis = 0;
    let dataAtual = moment(dataInicio);

    while (dataAtual.isSameOrBefore(dataFim, 'day')) {
        if (dataAtual.isBusinessDay() && !feriados.some(feriado => feriado.isSame(dataAtual, 'day'))) {
            diasUteis++;
        }
        dataAtual.add(1, 'day');
    }

    return diasUteis - 1;
}

async function buscarDiasDisponiveis() {
    let hoje = new Date();
    let dd = String(hoje.getDate()).padStart(2, '0');
    let mm = String(hoje.getMonth() + 1).padStart(2, '0'); // Janeiro é 0!
    let yyyy = hoje.getFullYear();

    hoje = yyyy + '-' + mm + '-' + dd;

    const horarios = await Horario.find({
        dia: { $gt: hoje }, // $gte significa "maior ou igual a"
        agendado: { $ne: 'Agendado' }
    });

    let diasDisponiveis = horarios.map(horario => horario.dia);

    diasDisponiveis = [...new Set(diasDisponiveis)];

    return diasDisponiveis;
}

async function buscarHorariosDisponiveis(dia) {
    const horarios = await Horario.find({
        dia,
        agendado: { $ne: 'Agendado' }
    });

    let horariosDisponiveis = horarios.map(horario => horario.horario);

    horariosDisponiveis = [...new Set(horariosDisponiveis)];

    return horariosDisponiveis.sort();
}

async function enfermeiraComMenosAgendamentos(horario, dia) {

    let enfermeiroComAAgendaMaisLivre = null;
    let maxAgendamentos = 0;

    let horarios = await Horario.find({
        dia,
        horario,
        agendado: { $ne: 'Agendado' }
    }).lean()

    const enfermeiros = horarios.map(horario => horario.enfermeiro)

    for (const enfermeiro of enfermeiros) {
        const agendamentos = await Horario.find({
            enfermeiro,
            dia,
            agendado: { $ne: 'Agendado' }
        }).lean()

        if (agendamentos.length > maxAgendamentos) {
            maxAgendamentos = agendamentos.length;
            enfermeiroComAAgendaMaisLivre = enfermeiro;
        }
    }
    return enfermeiroComAAgendaMaisLivre;
}

async function verificarHorarioDisponivel(dia, horario) {
    const horarios = await Horario.find({
        dia,
        horario,
        agendado: { $ne: 'Agendado' }
    });

    return horarios.length > 0;
}

module.exports = {
    ExcelDateToJSDate,
    calcularIdade,
    modeloMensagem1,
    modeloMensagem2,
    calcularDiasUteis,
    buscarDiasDisponiveis,
    buscarHorariosDisponiveis,
    enfermeiraComMenosAgendamentos,
    verificarHorarioDisponivel
}