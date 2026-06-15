export const MOCK_CLIENTS = [
  { 
    id: 1, name: 'Carlos Martínez', email: 'carlos@test.com', status: 'Activo', weight: '78.5kg', goal: 'Hipertrofia', completion: 85, nextReview: 'Pendiente', reviewFrequency: 'Bisemanal', unreadMessages: 2, nextPaymentDate: '2026-07-20', gracePeriod: null, lastPaymentDate: '2026-06-20', lastPaymentMethod: 'Bizum', billingPlanId: 'bp1',
    weightHistory: [72.0, 72.8, 73.5, 74.0, 74.8, 75.5, 76.2, 77.0, 77.5, 78.0, 79.1, 78.2],
    adherenceHistory: [90, 85, 95, 90, 100, 80, 95, 90, 100, 100, 95, 95],
    waistHistory: [82, 82.5, 83, 83.5, 84, 84, 84.5, 85, 85, 85.5, 87, 86],
    caderaHistory: [95, 95.5, 96, 96.5, 97, 97.5, 98, 98, 98.5, 99, 99.5, 99],
    cuelloHistory: [37, 37.5, 37.5, 38, 38, 38.5, 38.5, 39, 39, 39.5, 40, 39.5],
    bicepsHistory: [32, 32.5, 33, 34, 34.5, 35, 35.5, 36, 36.5, 37, 36.5, 37.5],
    piernaHistory: [55, 56, 57, 58, 59, 59.5, 60, 60.5, 61, 61.5, 61, 62],
    volumeHistory: [4500, 4800, 5200, 5500, 5800, 6000, 6500, 7000, 7500, 7800, 8200, 8500],
    lastCompletedReview: {
      reviewDate: '30/05/2026',
      globalFeedback: '¡Excelente progreso Carlos! Sigue dándole duro a las piernas y mantén esa constancia. Las marcas de la barra se notan.',
      weight: 78.2,
      waist: 86,
      cadera: 99,
      cuello: 39.5,
      biceps: 37.5,
      pierna: 62,
      photos: {
        front: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        left: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        right: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        back: 'https://images.unsplash.com/photo-1534438097549-b68e7eb8864f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
      },
      drawings: {},
      photoComments: {
        front: 'Buena amplitud de dorsales.',
        left: 'Intenta bajar un poco más la cadera en sentadilla, te marqué la zona.'
      }
    },
    pendingReviewData: null,
    messages: [
      { sender: 'coach', text: '¡Hola Carlos! ¿Cómo van esas agujetas del lunes?', time: 'Ayer 10:00' },
      { sender: 'client', text: 'Muriendo jaja, pero me siento genial.', time: 'Ayer 10:15' },
      { sender: 'coach', text: 'Esa es la actitud. Mañana subimos 2kg en press banca.', time: 'Ayer 10:18' }
    ]
  },
  { 
    id: 2, name: 'María López', email: 'maria@mail.com', status: 'Inactivo', weight: '62kg', goal: 'Pérdida de Grasa', completion: 40, nextReview: 'Pendiente', reviewFrequency: 'Semanal', unreadMessages: 0, nextPaymentDate: '2026-06-10', gracePeriod: null, lastPaymentDate: '2026-05-10', lastPaymentMethod: 'Transferencia',
    weightHistory: [64, 63.8, 63.5, 62],
    adherenceHistory: [80, 70, 50, 40],
    waistHistory: [75, 74, 73.5, 73],
    caderaHistory: [98, 97.5, 97, 96],
    cuelloHistory: [36, 36, 35.5, 35.5],
    bicepsHistory: [28, 28, 28.5, 28.5],
    piernaHistory: [55, 54.5, 54, 53.5],
    volumeHistory: [4000, 4200, 3800, 3500],
    messages: [
      { sender: 'coach', text: 'María, he visto que no has registrado entrenos esta semana. ¿Todo bien?', time: 'Hace 3 días' }
    ]
  },
  { 
    id: 3, name: 'Juan Pérez', email: 'juan@mail.com', status: 'Activo', weight: '85kg', goal: 'Fuerza', completion: 92, nextReview: '02/07/2026', reviewFrequency: 'Mensual', unreadMessages: 1, nextPaymentDate: '2026-06-18', gracePeriod: null, lastPaymentDate: '2026-05-18', lastPaymentMethod: 'Efectivo',
    weightHistory: [83, 83.5, 84.2, 85],
    adherenceHistory: [85, 90, 95, 92],
    waistHistory: [88, 88, 88.5, 89],
    caderaHistory: [100, 100, 101, 101.5],
    cuelloHistory: [41, 41.5, 41.5, 42],
    bicepsHistory: [39, 39.5, 40, 40.5],
    piernaHistory: [63, 63.5, 64.5, 65],
    volumeHistory: [9000, 9500, 10200, 11000],
    videoLink: 'https://youtube.com/shorts/sample',
    messages: [
      { sender: 'client', text: 'Antonio, hoy he sacado mi RM en sentadilla: 140kg', time: 'Hoy 09:00' },
      { sender: 'coach', text: '¡Bua! Eres una bestia. Lo apuntamos.', time: 'Hoy 09:05' }
    ]
  },
  {
    id: 4, name: 'Laura Sánchez', email: 'laura.s@test.com', status: 'Activo', weight: '68kg', goal: 'Recomposición', completion: 100, nextReview: '20/06/2026', reviewFrequency: 'Semanal', unreadMessages: 3, nextPaymentDate: '2026-06-17', gracePeriod: '2026-06-25', lastPaymentDate: '2026-05-17', lastPaymentMethod: 'Stripe', billingPlanId: 'bp1',
    weightHistory: [70, 69.5, 68.8, 68],
    adherenceHistory: [100, 100, 100, 100],
    waistHistory: [78, 77.5, 77, 76],
    caderaHistory: [102, 101.5, 101, 100.5],
    cuelloHistory: [34, 34, 34, 34],
    bicepsHistory: [29, 29.5, 30, 30.5],
    piernaHistory: [58, 58.5, 59, 59],
    volumeHistory: [5000, 5200, 5500, 5800],
    messages: [
      { sender: 'client', text: 'He notado que la ropa me queda mucho mejor', time: 'Ayer 18:30' },
      { sender: 'client', text: 'Y me siento con más energía. Te mandé las fotos por correo.', time: 'Ayer 18:32' },
      { sender: 'client', text: '¿Para cuándo la revisión de la dieta?', time: 'Ayer 18:35' }
    ]
  },
  {
    id: 5, name: 'Pedro Gómez', email: 'pedro.g@test.com', status: 'Activo', weight: '92kg', goal: 'Pérdida de Grasa', completion: 65, nextReview: 'Pendiente', reviewFrequency: 'Bisemanal', unreadMessages: 0, nextPaymentDate: '2026-06-05', gracePeriod: null, lastPaymentDate: '2026-05-05', lastPaymentMethod: 'Bizum', billingPlanId: 'bp1', hasRoutine: false,
    weightHistory: [95, 94, 93, 92],
    adherenceHistory: [60, 70, 65, 65],
    waistHistory: [105, 103, 101, 99],
    caderaHistory: [110, 109, 108, 107],
    cuelloHistory: [44, 43.5, 43, 42.5],
    bicepsHistory: [38, 38, 37.5, 37],
    piernaHistory: [68, 67.5, 67, 66.5],
    volumeHistory: [8000, 8500, 8200, 8100],
    messages: []
  },
  {
    id: 6, name: 'Ana Ruiz', email: 'ana.r@test.com', status: 'Activo', weight: '58kg', goal: 'Fuerza', completion: 88, nextReview: '25/06/2026', reviewFrequency: 'Mensual', unreadMessages: 0, nextPaymentDate: '2026-08-01', gracePeriod: null, lastPaymentDate: '2026-05-01', lastPaymentMethod: 'Transferencia', billingPlanId: 'bp2',
    weightHistory: [56, 56.5, 57, 58],
    adherenceHistory: [85, 90, 88, 88],
    waistHistory: [68, 68, 68.5, 69],
    caderaHistory: [92, 92.5, 93, 94],
    cuelloHistory: [32, 32, 32.5, 32.5],
    bicepsHistory: [26, 26.5, 27, 27.5],
    piernaHistory: [50, 51, 52, 53],
    volumeHistory: [3000, 3200, 3500, 3800],
    messages: [
      { sender: 'coach', text: 'Ana, vamos a intentar subir 1kg en todos los básicos esta semana.', time: 'Hace 2 días' },
      { sender: 'client', text: 'Hecho. A ver qué tal se da el peso muerto.', time: 'Hace 1 día' }
    ]
  },
  {
    id: 7, name: 'Javier Morales', email: 'javier.m@test.com', status: 'Activo', weight: '81kg', goal: 'Hipertrofia', completion: 75, nextReview: '30/06/2026', reviewFrequency: '3 Semanas', unreadMessages: 1, nextPaymentDate: '2026-06-15', gracePeriod: null, lastPaymentDate: '2026-05-15', lastPaymentMethod: 'Tarjeta', billingPlanId: 'bp1',
    weightHistory: [79, 79.5, 80, 81],
    adherenceHistory: [70, 75, 80, 75],
    waistHistory: [84, 84.5, 85, 85.5],
    caderaHistory: [98, 98.5, 99, 99.5],
    cuelloHistory: [39, 39.5, 39.5, 40],
    bicepsHistory: [35, 35.5, 36, 36.5],
    piernaHistory: [60, 60.5, 61, 61.5],
    volumeHistory: [6000, 6200, 6500, 6400],
    messages: [
      { sender: 'client', text: 'Me duele un poco el hombro derecho al hacer press militar, ¿qué hago?', time: 'Hace 1 hora' }
    ]
  },
  {
    id: 8, name: 'Sofía Castro', email: 'sofia.c@test.com', status: 'Inactivo', weight: '65kg', goal: 'Pérdida de Grasa', completion: 20, nextReview: 'Pendiente', reviewFrequency: 'Bisemanal', unreadMessages: 0, nextPaymentDate: '2026-04-20', gracePeriod: null, lastPaymentDate: '2026-03-20', lastPaymentMethod: 'Efectivo', billingPlanId: 'bp1',
    weightHistory: [67, 66.5, 66, 65],
    adherenceHistory: [40, 30, 20, 20],
    waistHistory: [80, 79, 78, 77],
    caderaHistory: [100, 99.5, 99, 98.5],
    cuelloHistory: [35, 35, 34.5, 34.5],
    bicepsHistory: [28, 28, 27.5, 27.5],
    piernaHistory: [56, 55.5, 55, 54.5],
    volumeHistory: [2500, 2000, 1500, 1000],
    messages: []
  },
  {
    id: 9, name: 'Diego Navarro', email: 'diego.n@test.com', status: 'Activo', weight: '88kg', goal: 'Fuerza', completion: 95, nextReview: '18/06/2026', reviewFrequency: 'Semanal', unreadMessages: 0, nextPaymentDate: '2026-12-01', gracePeriod: null, lastPaymentDate: '2026-06-01', lastPaymentMethod: 'Transferencia', billingPlanId: 'bp3',
    weightHistory: [85, 86, 87, 88],
    adherenceHistory: [90, 95, 95, 95],
    waistHistory: [86, 86.5, 87, 87.5],
    caderaHistory: [102, 102.5, 103, 103.5],
    cuelloHistory: [42, 42.5, 43, 43],
    bicepsHistory: [38, 38.5, 39, 39.5],
    piernaHistory: [64, 65, 66, 67],
    volumeHistory: [10000, 10500, 11000, 11500],
    messages: [
      { sender: 'coach', text: 'Diego, preparate para el ciclo de Smolov Jr. para banca.', time: 'Ayer' },
      { sender: 'client', text: 'Vamos a por ello.', time: 'Ayer' }
    ]
  },
  {
    id: 10, name: 'Elena Giménez', email: 'elena.g@test.com', status: 'Activo', weight: '55kg', goal: 'Recomposición', completion: 82, nextReview: '22/06/2026', reviewFrequency: 'Bisemanal', unreadMessages: 2, nextPaymentDate: '2026-06-25', gracePeriod: null, lastPaymentDate: '2026-05-25', lastPaymentMethod: 'Bizum', billingPlanId: 'bp1',
    weightHistory: [56, 55.8, 55.5, 55],
    adherenceHistory: [80, 85, 80, 82],
    waistHistory: [66, 65.5, 65, 64.5],
    caderaHistory: [90, 89.5, 89, 88.5],
    cuelloHistory: [31, 31, 30.5, 30.5],
    bicepsHistory: [25, 25.5, 25.5, 26],
    piernaHistory: [48, 48.5, 49, 49.5],
    volumeHistory: [3500, 3600, 3800, 4000],
    messages: [
      { sender: 'client', text: 'Hoy no puedo ir al gym, ¿qué rutina puedo hacer en casa?', time: 'Hace 30 minutos' },
      { sender: 'client', text: 'Solo tengo unas gomas elásticas y un par de mancuernas de 3kg.', time: 'Hace 28 minutos' }
    ]
  },
  {
    id: 11, name: 'Marcos Alonso', email: 'marcos.a@test.com', status: 'Activo', weight: '75kg', goal: 'Hipertrofia', completion: 78, nextReview: 'Pendiente', reviewFrequency: 'Mensual', unreadMessages: 0, nextPaymentDate: '2026-06-16', gracePeriod: 'Gratuito', lastPaymentDate: '2026-05-16', lastPaymentMethod: 'Efectivo', billingPlanId: 'bp1',
    weightHistory: [73, 73.5, 74, 75],
    adherenceHistory: [75, 75, 80, 78],
    waistHistory: [81, 81.5, 82, 82.5],
    caderaHistory: [96, 96.5, 97, 97.5],
    cuelloHistory: [38, 38, 38.5, 38.5],
    bicepsHistory: [34, 34.5, 35, 35.5],
    piernaHistory: [58, 58.5, 59, 59.5],
    volumeHistory: [5500, 5600, 5800, 6000],
    messages: []
  },
  {
    id: 12, name: 'Carmen Ortiz', email: 'carmen.o@test.com', status: 'Activo', weight: '60kg', goal: 'Pérdida de Grasa', completion: 90, nextReview: '28/06/2026', reviewFrequency: 'Bisemanal', unreadMessages: 1, nextPaymentDate: '2027-01-10', gracePeriod: null, lastPaymentDate: '2026-01-10', lastPaymentMethod: 'Tarjeta', billingPlanId: 'bp4',
    weightHistory: [65, 63, 61.5, 60],
    adherenceHistory: [90, 95, 85, 90],
    waistHistory: [76, 74, 72, 70],
    caderaHistory: [100, 98, 96, 94],
    cuelloHistory: [34, 33.5, 33, 32.5],
    bicepsHistory: [28, 27.5, 27, 26.5],
    piernaHistory: [56, 55, 54, 53],
    volumeHistory: [4500, 4800, 4600, 4700],
    messages: [
      { sender: 'client', text: '¡He llegado a mi objetivo de 60kg! Estoy super contenta.', time: 'Hoy 07:15' }
    ]
  },
  {
    id: 13, name: 'Pablo Vázquez', email: 'pablo.v@test.com', status: 'Inactivo', weight: '82kg', goal: 'Hipertrofia', completion: 15, nextReview: 'Pendiente', reviewFrequency: 'Semanal', unreadMessages: 0, nextPaymentDate: '2026-05-01', gracePeriod: null, lastPaymentDate: '2026-04-01', lastPaymentMethod: 'Transferencia', billingPlanId: 'bp1',
    weightHistory: [80, 81, 81.5, 82],
    adherenceHistory: [60, 40, 20, 15],
    waistHistory: [85, 86, 86.5, 87],
    caderaHistory: [99, 100, 100.5, 101],
    cuelloHistory: [40, 40, 40.5, 40.5],
    bicepsHistory: [36, 36, 36, 36],
    piernaHistory: [61, 61, 61, 61],
    volumeHistory: [3000, 2000, 1000, 500],
    messages: []
  },
  {
    id: 14, name: 'Lucía Domínguez', email: 'lucia.d@test.com', status: 'Activo', weight: '59kg', goal: 'Fuerza', completion: 98, nextReview: '16/06/2026', reviewFrequency: 'Bisemanal', unreadMessages: 0, nextPaymentDate: '2026-07-05', gracePeriod: null, lastPaymentDate: '2026-06-05', lastPaymentMethod: 'Bizum', billingPlanId: 'bp1',
    weightHistory: [58, 58.2, 58.6, 59],
    adherenceHistory: [95, 98, 100, 98],
    waistHistory: [67, 67, 67.5, 67.5],
    caderaHistory: [91, 91.5, 92, 92.5],
    cuelloHistory: [32, 32, 32.5, 32.5],
    bicepsHistory: [27, 27.5, 28, 28.5],
    piernaHistory: [52, 53, 54, 55],
    volumeHistory: [4000, 4300, 4600, 5000],
    messages: [
      { sender: 'coach', text: 'Acuérdate de grabar la serie pesada de sentadilla hoy.', time: 'Ayer' },
      { sender: 'client', text: 'Sí, ya la tengo, luego te la subo.', time: 'Ayer' }
    ]
  },
  {
    id: 15, name: 'Jorge Romero', email: 'jorge.r@test.com', status: 'Activo', weight: '95kg', goal: 'Recomposición', completion: 70, nextReview: '19/06/2026', reviewFrequency: 'Mensual', unreadMessages: 1, nextPaymentDate: '2026-06-14', gracePeriod: '2026-06-21', lastPaymentDate: '2026-05-14', lastPaymentMethod: 'Tarjeta', billingPlanId: 'bp1',
    weightHistory: [98, 97, 96, 95],
    adherenceHistory: [80, 75, 70, 70],
    waistHistory: [108, 106, 104, 102],
    caderaHistory: [112, 111, 110, 109],
    cuelloHistory: [45, 44.5, 44, 43.5],
    bicepsHistory: [39, 39, 39.5, 40],
    piernaHistory: [69, 69, 69.5, 70],
    volumeHistory: [7000, 7200, 7000, 7500],
    messages: [
      { sender: 'client', text: 'Ayer tuve una cena de empresa y me pasé un poco con la comida...', time: 'Hoy 10:00' }
    ]
  },
  {
    id: 16, name: 'Silvia Ibáñez', email: 'silvia.i@test.com', status: 'Activo', weight: '52kg', goal: 'Hipertrofia', completion: 85, nextReview: '26/06/2026', reviewFrequency: 'Bisemanal', unreadMessages: 0, nextPaymentDate: '2026-09-10', gracePeriod: null, lastPaymentDate: '2026-06-10', lastPaymentMethod: 'Transferencia', billingPlanId: 'bp2',
    weightHistory: [50, 50.5, 51, 52],
    adherenceHistory: [85, 80, 90, 85],
    waistHistory: [64, 64.5, 65, 65.5],
    caderaHistory: [88, 88.5, 89, 89.5],
    cuelloHistory: [30, 30, 30.5, 30.5],
    bicepsHistory: [24, 24.5, 25, 25.5],
    piernaHistory: [46, 47, 48, 49],
    volumeHistory: [3200, 3400, 3700, 4000],
    messages: []
  },
  {
    id: 17, name: 'Raúl Medina', email: 'raul.m@test.com', status: 'Activo', weight: '70kg', goal: 'Fuerza', completion: 100, nextReview: '17/06/2026', reviewFrequency: 'Semanal', unreadMessages: 2, nextPaymentDate: '2026-06-13', gracePeriod: null, lastPaymentDate: '2026-05-13', lastPaymentMethod: 'Efectivo', billingPlanId: 'bp1',
    weightHistory: [68, 68.5, 69, 70],
    adherenceHistory: [100, 100, 100, 100],
    waistHistory: [78, 78, 78.5, 79],
    caderaHistory: [94, 94.5, 95, 95.5],
    cuelloHistory: [37, 37, 37.5, 37.5],
    bicepsHistory: [33, 33.5, 34, 34.5],
    piernaHistory: [57, 58, 59, 60],
    volumeHistory: [6000, 6500, 7000, 7500],
    messages: [
      { sender: 'client', text: 'Mañana toca dominadas lastradas.', time: 'Ayer' },
      { sender: 'client', text: '¿Cuánto peso me pongo para la serie de aproximación?', time: 'Ayer' }
    ]
  },
  {
    id: 18, name: 'Alba Fuentes', email: 'alba.f@test.com', status: 'Activo', weight: '72kg', goal: 'Pérdida de Grasa', completion: 60, nextReview: 'Pendiente', reviewFrequency: 'Bisemanal', unreadMessages: 0, nextPaymentDate: '2026-07-28', gracePeriod: null, lastPaymentDate: '2026-06-28', lastPaymentMethod: 'Bizum', billingPlanId: 'bp1',
    weightHistory: [75, 74, 73, 72],
    adherenceHistory: [70, 65, 60, 60],
    waistHistory: [82, 81, 80, 79],
    caderaHistory: [104, 103, 102, 101],
    cuelloHistory: [36, 35.5, 35, 34.5],
    bicepsHistory: [30, 29.5, 29, 28.5],
    piernaHistory: [60, 59.5, 59, 58.5],
    volumeHistory: [4000, 3800, 3500, 3600],
    messages: []
  },
  {
    id: 19, name: 'Rubén Costa', email: 'ruben.c@test.com', status: 'Activo', weight: '84kg', goal: 'Recomposición', completion: 92, nextReview: '21/06/2026', reviewFrequency: 'Mensual', unreadMessages: 1, nextPaymentDate: '2026-06-19', gracePeriod: null, lastPaymentDate: '2026-05-19', lastPaymentMethod: 'Tarjeta', billingPlanId: 'bp1',
    weightHistory: [86, 85, 84.5, 84],
    adherenceHistory: [85, 90, 92, 92],
    waistHistory: [90, 89, 88.5, 88],
    caderaHistory: [102, 101.5, 101, 100.5],
    cuelloHistory: [41, 40.5, 40, 40],
    bicepsHistory: [36, 36.5, 37, 37.5],
    piernaHistory: [62, 62.5, 63, 63.5],
    volumeHistory: [8000, 8300, 8600, 9000],
    messages: [
      { sender: 'client', text: 'Siento que el bíceps no me crece al mismo ritmo que el pecho.', time: 'Hoy 12:00' }
    ]
  },
  {
    id: 20, name: 'Patricia Vega', email: 'patricia.v@test.com', status: 'Inactivo', weight: '54kg', goal: 'Fuerza', completion: 10, nextReview: 'Pendiente', reviewFrequency: 'Semanal', unreadMessages: 0, nextPaymentDate: '2026-02-15', gracePeriod: null, lastPaymentDate: '2026-01-15', lastPaymentMethod: 'Transferencia', billingPlanId: 'bp1',
    weightHistory: [52, 53, 53.5, 54],
    adherenceHistory: [30, 20, 10, 10],
    waistHistory: [65, 65.5, 66, 66.5],
    caderaHistory: [89, 89.5, 90, 90.5],
    cuelloHistory: [30, 30.5, 30.5, 31],
    bicepsHistory: [25, 25.5, 26, 26.5],
    piernaHistory: [48, 49, 49.5, 50],
    volumeHistory: [2000, 1500, 1000, 500],
    messages: []
  }
];
