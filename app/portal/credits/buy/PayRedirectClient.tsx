'use client';

import s from '../../portal.module.css';

interface Props {
  url: string;
  packageName: string;
  priceAed: string;
}

export default function PayRedirectClient({ url, packageName, priceAed }: Props) {
  return (
    <div className={s.payRedirectWrap}>
      <div className={s.payRedirectCard}>
        <p className={s.payRedirectPackage}>{packageName}</p>
        <p className={s.payRedirectAmount}>{priceAed}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={s.primaryBtn}
        >
          Complete Payment
        </a>
        <p className={s.payRedirectHint}>
          Tap the button above to open the secure payment page.
        </p>
      </div>
    </div>
  );
}
