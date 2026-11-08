// Picture guides for wudu and sholat, drawn from the Dunia Baby Mo pose
// renders (public/img/poses). Each step has one or more frames that play in a
// loop, like a little cartoon, with a short sentence a child can follow.
import type { T2 } from '../i18n';
import type { PrayerPose } from './models';

export interface GuideStep { name: T2; say: T2; frames: string[] }
const img = (n: string) => `img/poses/${n}.webp`;

export const WUDU_GUIDE: GuideStep[] = [
  { name: ['Niat & Bismillah', 'Intention & Bismillah'], say: ['Berniat dalam hati untuk berwudhu, lalu ucapkan Bismillah.', 'Make the intention in your heart to do wudu, then say Bismillah.'], frames: [img('w01')] },
  { name: ['Cuci kedua tangan', 'Wash both hands'], say: ['Cuci kedua telapak tangan sampai pergelangan, 3 kali.', 'Wash both hands up to the wrists, 3 times.'], frames: [img('w02')] },
  { name: ['Berkumur', 'Rinse the mouth'], say: ['Masukkan air ke mulut, kumur-kumur, lalu buang. 3 kali.', 'Take water into your mouth, swirl it, then spit it out. 3 times.'], frames: [img('w03')] },
  { name: ['Bersihkan hidung', 'Rinse the nose'], say: ['Hirup sedikit air ke hidung, lalu keluarkan. 3 kali.', 'Breathe a little water into your nose, then blow it out. 3 times.'], frames: [img('w04')] },
  { name: ['Basuh wajah', 'Wash the face'], say: ['Basuh seluruh wajah dari dahi sampai dagu, 3 kali.', 'Wash your whole face from forehead to chin, 3 times.'], frames: [img('w05')] },
  { name: ['Basuh tangan sampai siku', 'Wash arms to the elbows'], say: ['Basuh tangan kanan sampai siku, lalu tangan kiri. 3 kali.', 'Wash your right arm to the elbow, then the left. 3 times.'], frames: [img('w06a'), img('w06b')] },
  { name: ['Usap kepala', 'Wipe the head'], say: ['Usap kepala dengan tangan yang basah.', 'Wipe over your head with wet hands.'], frames: [img('w07')] },
  { name: ['Usap telinga', 'Wipe the ears'], say: ['Usap kedua telinga, bagian dalam dan luar.', 'Wipe both ears, inside and out.'], frames: [img('w08')] },
  { name: ['Basuh kaki', 'Wash the feet'], say: ['Basuh kaki kanan sampai mata kaki, lalu kaki kiri. 3 kali.', 'Wash your right foot up to the ankle, then the left. 3 times.'], frames: [img('w09a'), img('w09b')] },
  { name: ['Doa setelah wudhu', 'Du’a after wudu'], say: ['Angkat tangan dan berdoa: Asyhadu an laa ilaaha illallah…', 'Raise your hands and say: Ash-hadu an laa ilaaha illallah…'], frames: [img('w10')] },
];

export const SHOLAT_GUIDE: GuideStep[] = [
  { name: ['Niat', 'Intention'], say: ['Berdiri tegak menghadap kiblat dan berniat dalam hati.', 'Stand straight facing the qibla and make the intention in your heart.'], frames: [img('s01a'), img('s01b')] },
  { name: ['Takbiratul ihram', 'Opening takbir'], say: ['Angkat kedua tangan sejajar telinga sambil mengucap “Allahu Akbar”.', 'Raise both hands level with your ears and say “Allahu Akbar”.'], frames: [img('s02a'), img('s02b')] },
  { name: ['Berdiri & membaca', 'Standing & reciting'], say: ['Letakkan tangan kanan di atas tangan kiri di dada. Baca doa iftitah dan Al-Fatihah.', 'Put your right hand over your left on your chest. Read the opening du’a and Al-Fatihah.'], frames: [img('s03a'), img('s03b')] },
  { name: ['Rukuk', 'Bowing (ruku’)'], say: ['Membungkuk, tangan memegang lutut, punggung lurus. Baca: “Subhana rabbiyal ‘azhim”.', 'Bow down, hands on your knees, back straight. Say: “Subhana rabbiyal ‘azhim”.'], frames: [img('s04a'), img('s04b'), img('s04c')] },
  { name: ['Sujud', 'Prostrating (sujud)'], say: ['Dahi, hidung, kedua tangan, lutut dan ujung kaki menyentuh lantai. Baca: “Subhana rabbiyal a’la”.', 'Forehead, nose, both hands, knees and toes touch the floor. Say: “Subhana rabbiyal a’la”.'], frames: [img('s05a'), img('s05b'), img('s05c')] },
  { name: ['Tahiyat awal', 'First sitting'], say: ['Setelah rakaat kedua, duduk dan membaca tasyahud.', 'After the second rakaat, sit and read the tashahhud.'], frames: [img('s06a'), img('s06b'), img('s06c'), img('s06d')] },
  { name: ['Tahiyat akhir', 'Final sitting'], say: ['Di rakaat terakhir, duduk tahiyat akhir, membaca tasyahud dan shalawat.', 'In the last rakaat, sit for the final tashahhud and send blessings on the Prophet ﷺ.'], frames: [img('s07a'), img('s07b'), img('s07c'), img('s07d')] },
  { name: ['Salam ke kanan', 'Salam to the right'], say: ['Menoleh ke kanan: “Assalamu’alaikum warahmatullah”.', 'Turn to the right: “Assalamu’alaikum warahmatullah”.'], frames: [img('s08a')] },
  { name: ['Salam ke kiri', 'Salam to the left'], say: ['Menoleh ke kiri: “Assalamu’alaikum warahmatullah”.', 'Turn to the left: “Assalamu’alaikum warahmatullah”.'], frames: [img('s09a'), img('s09b')] },
  { name: ['Berdoa', 'Du’a'], say: ['Setelah salam, berdzikir dan berdoa kepada Allah.', 'After the salam, remember Allah and make du’a.'], frames: [img('s10a'), img('s10b')] },
];

/** the picture that matches the row's current position while praying together */
export function poseFrames(pose: PrayerPose, step: string, head: number): string[] {
  if (head > 0.2) return SHOLAT_GUIDE[7].frames;
  if (head < -0.2) return SHOLAT_GUIDE[8].frames;
  if (step.includes('Allahu') || step.includes('takbir')) return SHOLAT_GUIDE[1].frames;
  if (pose === 'ruku') return SHOLAT_GUIDE[3].frames;
  if (pose === 'sujud') return SHOLAT_GUIDE[4].frames;
  if (pose === 'julus') return step.includes('akhir') || step.includes('Final') ? SHOLAT_GUIDE[6].frames : SHOLAT_GUIDE[5].frames;
  return SHOLAT_GUIDE[2].frames;
}
