"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function AboutUs() {
  return (
    <section className="w-full bg-white py-16 lg:pb-32" id="about">
      <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-0">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col gap-16 lg:flex-row lg:items-center lg:gap-20"
        >
          {/* Left Content */}
          <motion.div variants={fadeLeft} className="flex flex-1 flex-col gap-10">
            {/* Header Group */}
            <div className="flex flex-col gap-6">
              <span className="font-inter font-semibold text-[#FE9114] text-sm tracking-widest md:text-base">
                ABOUT MULAI+
              </span>
              <div className="flex flex-col gap-6">
                <h2 className="font-bold font-bricolage text-4xl text-[#1A1F6D] leading-tight md:text-5xl lg:text-[64px]">
                  Bimbingan Nyata Untuk Keputusan Masa Depanmu
                </h2>
              </div>
            </div>

            {/* Content Text */}
            <div className="flex flex-col gap-6 font-inter text-[#888888] text-lg md:text-xl">
              <p>
                MULAI+ adalah platform pendampingan terstruktur untuk membantu siswa mengambil keputusan akademik dan
                masa depan dengan lebih terarah, realistis, dan percaya diri.
              </p>
              <p>
                Kami tidak hanya memberikan motivasi, tetapi menghadirkan sistem, refleksi, dan strategi yang membantu
                siswa memahami potensi diri, mengeksplorasi jurusan, serta menyusun rencana masuk universitas secara
                matang.
              </p>
              <p>
                MULAI+ hadir sebagai ruang aman sekaligus ruang tumbuh, tempat kebingungan diolah menjadi kejelasan, dan
                keraguan diubah menjadi keputusan.
              </p>
            </div>
          </motion.div>

          {/* Right Content - Images & Stats */}
          <motion.div variants={fadeRight} className="flex flex-1 justify-center lg:justify-end">
            <div className="flex flex-1 gap-4 sm:gap-6 md:gap-9">
              {/* Column 1 */}
              <div className="flex flex-1 flex-col gap-4 sm:gap-6 md:gap-9">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                  className="relative h-[280px] w-full overflow-hidden rounded-2xl sm:h-[360px] sm:w-[220px] md:h-[454px] md:w-full"
                >
                  <Image
                    src="/about-us/image-1.webp"
                    alt="Mentoring Session"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 25vw"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                  className="flex h-[100px] w-full flex-col items-center justify-center rounded-2xl bg-[#FE9114] text-white sm:h-[120px] sm:w-[220px] md:h-[151px] md:w-full"
                >
                  <span className="font-bold font-bricolage text-3xl md:text-5xl">10+</span>
                  <span className="font-inter font-medium text-sm md:text-xl">Mentor Aktif</span>
                </motion.div>
              </div>

              {/* Column 2 - Offset Top */}
              <div className="flex flex-1 flex-col gap-4 pt-12 sm:gap-6 sm:pt-16 md:gap-9 md:pt-24">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                  className="flex h-[100px] w-full flex-col items-center justify-center rounded-2xl bg-[#F93447] text-white sm:h-[120px] sm:w-[220px] md:h-[151px] md:w-full"
                >
                  <span className="font-bold font-bricolage text-3xl md:text-5xl">6 Minggu</span>
                  <span className="font-inter font-medium text-sm md:text-xl">Program Terstruktur</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                  className="relative h-[280px] w-full overflow-hidden rounded-2xl sm:h-[360px] sm:w-[220px] md:h-[454px] md:w-full"
                >
                  <Image
                    src="/about-us/image-2.webp"
                    alt="Global Community"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 25vw"
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
