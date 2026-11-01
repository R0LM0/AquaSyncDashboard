import { describe, expect, it } from 'vitest'
import {
  mapActividadEvento,
  mapBarridoActividad,
  mapBarridoAsignaciones,
  mapBarridoPendientes,
  mapServiciosNuevos,
} from './dto'

describe('mapBarridoAsignaciones', () => {
  it('maps every assignment and stringifies the ids', () => {
    const rows = mapBarridoAsignaciones([
      {
        UsrId: 7, Usuario: 'jperez', CliBarridoId: 12, Filial: '01', Zona: '02', Ruta: '03',
        PeriodoId: 202610, Periodo: 'Octubre 2026', Asignadas: 100, Encuestadas: 40, Pendientes: 60, Avance: 40,
      },
    ])
    expect(rows).toEqual([
      {
        usrId: '7', usuario: 'jperez', cliBarridoId: '12', filial: '01', zona: '02', ruta: '03',
        periodoId: '202610', periodo: 'Octubre 2026', asignadas: 100, encuestadas: 40, pendientes: 60, avance: 40,
      },
    ])
  })

  it('tolerates a null body and null text fields', () => {
    expect(mapBarridoAsignaciones(null)).toEqual([])
    expect(
      mapBarridoAsignaciones([
        { UsrId: 1, Usuario: null, CliBarridoId: 2, Filial: null, Zona: null, Ruta: null, PeriodoId: 3, Periodo: null, Asignadas: 0, Encuestadas: 0, Pendientes: 0, Avance: 0 },
      ])[0],
    ).toMatchObject({ usuario: '', filial: '', zona: '', ruta: '', periodo: '' })
  })
})

describe('mapBarridoActividad', () => {
  it('maps resumen, por dia, dispositivos and puntos', () => {
    const data = mapBarridoActividad({
      Resumen: { Encuestas: 5, Hoy: 2, Dispositivos: 1 },
      PorDia: [{ Fecha: '2026-11-01T00:00:00', Dispositivo: 'Dispositivo A', Cantidad: 5 }],
      Dispositivos: [
        { Usuario: 'enc1', DispositivoId: 'abc', Alias: 'Dispositivo A', Modelo: 'SM-A12', AppVersion: '1.17.0', Encuestas: 5, Primera: '2026-11-01T14:00:00Z', Ultima: '2026-11-01T16:00:00Z', Lat: 12.1, Lng: -86.2 },
      ],
      Puntos: [{ Cuenta: 1234, Catastro: 'C-1', Alias: 'Dispositivo A', Fecha: '2026-11-01T14:00:00Z', Lat: 12.1, Lng: -86.2 }],
    })
    expect(data.resumen).toEqual({ encuestas: 5, hoy: 2, dispositivos: 1 })
    expect(data.porDia).toEqual([{ fecha: '2026-11-01', dispositivo: 'Dispositivo A', cantidad: 5 }])
    expect(data.dispositivos[0]).toEqual({
      usuario: 'enc1', dispositivoId: 'abc', alias: 'Dispositivo A', modelo: 'SM-A12', appVersion: '1.17.0',
      cantidad: 5, primera: '2026-11-01T14:00:00Z', ultima: '2026-11-01T16:00:00Z', lat: 12.1, lng: -86.2,
    })
    expect(data.puntos[0]).toEqual({ cuenta: '1234', catastro: 'C-1', alias: 'Dispositivo A', fecha: '2026-11-01T14:00:00Z', lat: 12.1, lng: -86.2 })
  })

  it('guards missing arrays, nulls and a missing resumen', () => {
    expect(mapBarridoActividad({} as never)).toEqual({
      resumen: { encuestas: 0, hoy: 0, dispositivos: 0 },
      porDia: [],
      dispositivos: [],
      puntos: [],
    })
    const nulls = mapBarridoActividad({
      Dispositivos: [{ Usuario: 'u', DispositivoId: null, Alias: null, Modelo: null, AppVersion: null, Encuestas: 1, Primera: null, Ultima: null, Lat: null, Lng: null }],
      Puntos: [{ Cuenta: 1, Catastro: null, Alias: null, Fecha: '2026-11-01T10:00:00Z', Lat: null, Lng: null }],
    } as never)
    expect(nulls.dispositivos[0]).toMatchObject({ dispositivoId: '', alias: '', modelo: '', appVersion: '', primera: null, ultima: null, lat: null, lng: null })
    expect(nulls.puntos[0]).toMatchObject({ catastro: '', alias: '', lat: null, lng: null })
  })
})

describe('mapBarridoPendientes', () => {
  it('maps pending accounts and tolerates null', () => {
    expect(mapBarridoPendientes(null)).toEqual([])
    expect(
      mapBarridoPendientes([{ ClienteBarridoId: 9, CuentaNro: 55, Catastro: null, Cliente: 'Ana', Direccion: null, Lat: 12, Lng: -86 }]),
    ).toEqual([{ clienteBarridoId: '9', cuentaNro: '55', catastro: '', cliente: 'Ana', direccion: '', lat: 12, lng: -86 }])
  })
})

describe('mapServiciosNuevos', () => {
  it('maps resumen with estados, registros and devices', () => {
    const data = mapServiciosNuevos({
      Resumen: { Registrados: 3, Hoy: 1, PorEstado: [{ Estado: 'Pendiente', Cantidad: 2 }] },
      PorDia: [{ Fecha: '2026-11-01', Dispositivo: 'Dispositivo B', Cantidad: 3 }],
      Dispositivos: [],
      Registros: [
        { Id: 77, Fecha: '2026-11-01T15:00:00Z', Usuario: 'u1', Alias: 'Dispositivo B', Modelo: 'Moto', Estado: 'Pendiente', Sucursal: 'Managua', Cliente: 'Ana Pérez', Lat: 12.1, Lng: -86.2 },
      ],
    })
    expect(data.resumen).toEqual({ registrados: 3, hoy: 1, porEstado: [{ estado: 'Pendiente', cantidad: 2 }] })
    expect(data.registros[0]).toEqual({
      id: '77', fecha: '2026-11-01T15:00:00Z', usuario: 'u1', alias: 'Dispositivo B', modelo: 'Moto',
      estado: 'Pendiente', sucursal: 'Managua', cliente: 'Ana Pérez', lat: 12.1, lng: -86.2,
    })
  })

  it('guards missing arrays and nulls', () => {
    expect(mapServiciosNuevos({} as never)).toEqual({
      resumen: { registrados: 0, hoy: 0, porEstado: [] },
      porDia: [],
      dispositivos: [],
      registros: [],
    })
    expect(
      mapServiciosNuevos({
        Registros: [{ Id: 1, Fecha: '2026-11-01T15:00:00Z', Usuario: null, Alias: null, Modelo: null, Estado: null, Sucursal: null, Cliente: null, Lat: null, Lng: null }],
      } as never).registros[0],
    ).toMatchObject({ usuario: '', alias: '', modelo: '', estado: '', sucursal: '', cliente: '', lat: null, lng: null })
  })
})

describe('mapActividadEvento', () => {
  it('maps the SignalR payload', () => {
    expect(mapActividadEvento({ Modulo: 'barrido', Usuario: 'u', IdUgestion: 4, IdSucursal: null })).toEqual({
      modulo: 'barrido', usuario: 'u', ugestionId: '4', sucursalId: null,
    })
  })
})
