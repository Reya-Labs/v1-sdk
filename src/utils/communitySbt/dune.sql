with mint_burn as (
    SELECT amount/1e18 as amount, 'rETH' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.rocket_july1_183days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e18 as amount, 'rETH' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.rocket_july1_183days_vamm_evt_Burn
    UNION ALL
    SELECT amount/1e18 as amount, 'stETH' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.lido_july1_183days_vamm_evt_Mint
    UNION ALL
    SELECT  -amount/1e18 as amount, 'stETH' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.lido_july1_183days_vamm_evt_Burn
    UNION ALL
    SELECT amount/1e18 as amount, 'cDAI' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.VoltzPool3VAMM_evt_Mint
    UNION ALL
    SELECT -amount/1e18 as amount, 'cDAI' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.VoltzPool3VAMM_evt_Burn
    UNION ALL
    SELECT amount/1e18 as amount, 'aDAI' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.VoltzPool2VAMM_evt_Mint
    UNION ALL
    SELECT -amount/1e18 as amount, 'aDAI' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.VoltzPool2VAMM_evt_Burn
    UNION ALL
    SELECT amount/1e6 as amount, 'aUSDC' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.VoltzPool1VAMM_evt_Mint
    UNION ALL
    SELECT -amount/1e6 as amount, 'aUSDC' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.VoltzPool1VAMM_evt_Burn
    
    
    UNION ALL
    SELECT amount/1e18 as amount, 'cDAI_v2' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.cDAI_july31_61days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e18 as amount, 'cDAI_v2' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.cDAI_july31_61days_vamm_evt_Burn
    UNION ALL
    SELECT amount/1e18 as amount, 'aDAI_v2' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aDAI_july31_61days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e18 as amount, 'aDAI_v2' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aDAI_july31_61days_vamm_evt_Burn
    UNION ALL
    SELECT amount/1e6 as amount, 'aUSDC_v2' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aUSDC_july31_61days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e6 as amount, 'aUSDC_v2' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aUSDC_july31_61days_vamm_evt_Burn
    
    UNION ALL
    SELECT amount/1e18 as amount, 'aETH_borrow' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aave_ETH_borrow_august22_131days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e18 as amount, 'aETH_borrow' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aave_ETH_borrow_august22_131days_vamm_evt_Burn
    UNION ALL
    SELECT amount/1e6 as amount, 'cUSDT_borrow' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.cUSDT_borrow_august22_221days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e6 as amount, 'cUSDT_borrow' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.cUSDT_borrow_august22_221days_vamm_evt_Burn
    UNION ALL
    SELECT amount/1e6 as amount, 'aUSDC_borrow' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aUSDC_borrow_august22_221days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e6 as amount, 'aUSDC_borrow' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aUSDC_borrow_august22_221days_vamm_evt_Burn
    
    UNION ALL
    SELECT amount/1e18 as amount, 'aETH_borrow_v2' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aETH_borrow_september30_182days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e18 as amount, 'aETH_borrow_v2' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aETH_borrow_september30_182days_vamm_evt_Burn
    UNION ALL
    SELECT amount/1e18 as amount, 'aDAI_v3' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aDAI_september30_92days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e18 as amount, 'aDAI_v3' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aDAI_september30_92days_vamm_evt_Burn
    UNION ALL
    SELECT amount/1e18 as amount, 'aETH' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aETH_september30_92days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e18 as amount, 'aETH' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aETH_september30_92days_vamm_evt_Burn
    UNION ALL
    SELECT amount/1e6 as amount, 'aUSDC_v3' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aUSDC_2_september30_92days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e6 as amount, 'aUSDC_v3' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.aUSDC_2_september30_92days_vamm_evt_Burn
    UNION ALL
    SELECT amount/1e18 as amount, 'cDAI_v3' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.cDAI_2_september30_92days_vamm_evt_Mint
    UNION ALL
    SELECT -amount/1e18 as amount, 'cDAI_v3' as Token, tickLower AS lowerTick, tickUpper as upperTick, date_trunc('day', evt_block_time) as myDate
    FROM voltz_ethereum.cDAI_2_september30_92days_vamm_evt_Burn
), 

aggregated as (
    SELECT 
        myDate,
        lowerTick,
        upperTick,
        Token,
        SUM(amount/abs(upperTick-lowerTick/60)) over (partition by Token,lowerTick, upperTick, myDate ) as summ,
        SUM(amount/abs(upperTick-lowerTick/60)) over (partition by Token,lowerTick, upperTick  ) as summ_day
    FROM mint_burn
    order by Token
),

liq_ticks as (
    SELECT
        myDate
        , Token      
       , explode(sequence(lowerTick, UpperTick, 60)) as tick
       , summ as summ
       , summ_day as summ_day
    FROM aggregated
),

ethprice as (
    select
    price
    from prices.usd
    where symbol = 'WETH'
    order by minute desc
    limit 1
),

max_min_ticks as (
    select
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aave_ETH_borrow' as Token
    from voltz_ethereum.aave_ETH_borrow_august22_131days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'cUSDT_borrow' as Token
    from voltz_ethereum.cUSDT_borrow_august22_221days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aUSDC_borrow' as Token
    from voltz_ethereum.aUSDC_borrow_august22_221days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aUSDC' as Token
    from voltz_ethereum.VoltzPool1VAMM_evt_VAMMPriceChange
    group by myDate
    union all
    select 
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aDAI' as Token
    from voltz_ethereum.VoltzPool2VAMM_evt_VAMMPriceChange
    group by myDate
    union all
    select 
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'cDAI' as Token
    from voltz_ethereum.VoltzPool3VAMM_evt_VAMMPriceChange
    group by myDate
    union all
    select
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aUSDC' as Token
    from voltz_ethereum.aUSDC_july31_61days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select 
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aDAI' as Token
    from voltz_ethereum.aDAI_july31_61days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select 
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'cDAI' as Token
    from voltz_ethereum.cDAI_july31_61days_vamm_evt_VAMMPriceChange 
    group by myDate
    union all
    select 
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'rETH' as Token
    from voltz_ethereum.rocket_july1_183days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select 
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'stETH' as Token
    from voltz_ethereum.lido_july1_183days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aETH_borrow_v2' as Token
    from voltz_ethereum.aETH_borrow_september30_182days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aETH_borrow' as Token
    from voltz_ethereum.aave_ETH_borrow_august22_131days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aDAI' as Token
    from voltz_ethereum.aDAI_september30_92days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select
    min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aETH' as Token
    from voltz_ethereum.aETH_september30_92days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    SELECT min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    , 'cDAI' AS Token
    from voltz_ethereum.cDAI_2_september30_92days_vamm_evt_VAMMPriceChange
    group by myDate
    union all
    select min(tick) as minTick, max(tick) as maxTick, date_trunc('day', evt_block_time) as myDate
    ,   'aUSDC' as Token
    from voltz_ethereum.aUSDC_2_september30_92days_vamm_evt_VAMMPriceChange
    group by myDate
),

liq_tick_day as ( 
    SELECT
        a.myDate,                             
        ROUND(1/power(1.0001, tick), 3) AS fixed_apy,
        tick,
        a.Token,
         case 
            when a.Token in ('stETH', 'rETH', 'aave_ETH_borrow', 'aETH', 'aETH_borrow_v2')  then summ*price
            else summ
       end as summ
       , case 
            when a.Token in ('stETH', 'rETH', 'aave_ETH_borrow', 'aETH', 'aETH_borrow_v2')  then summ_day*price
            else summ_day
        end as summ_day
    FROM liq_ticks a, ethPrice
    left join max_min_ticks b
    on b.Token = a.Token and a.tick <= b.maxTick and a.tick >= b.minTick and a.myDate = b.myDate
),

pools as (
    select
    evt_block_time, variableTokenDelta
    ,   'aave_ETH_borrow' as Token
    from voltz_ethereum.aave_ETH_borrow_august22_131days_vamm_evt_Swap
    union all
    select
    evt_block_time, variableTokenDelta
    ,   'cUSDT_borrow' as Token
    from voltz_ethereum.cUSDT_borrow_august22_221days_vamm_evt_Swap
    union all
    select
    evt_block_time, variableTokenDelta
    ,   'aUSDC_borrow' as Token
    from voltz_ethereum.aUSDC_borrow_august22_221days_vamm_evt_Swap
    union all
    select
    evt_block_time, variableTokenDelta
    ,   'aUSDC' as Token
    from voltz_ethereum.VoltzPool1VAMM_evt_Swap 
    union all
    select 
    evt_block_time, variableTokenDelta
    ,   'aDAI' as Token
    from voltz_ethereum.VoltzPool2VAMM_evt_Swap 
    union all
    select 
    evt_block_time, variableTokenDelta
    ,   'cDAI' as Token
    from voltz_ethereum.VoltzPool3VAMM_evt_Swap 
    union all
    select
    evt_block_time, variableTokenDelta
    ,   'aUSDC' as Token
    from voltz_ethereum.aUSDC_july31_61days_vamm_evt_Swap 
    union all
    select 
    evt_block_time, variableTokenDelta
    ,   'aDAI' as Token
    from voltz_ethereum.aDAI_july31_61days_vamm_evt_Swap 
    union all
    select 
    evt_block_time, variableTokenDelta
    ,   'cDAI' as Token
    from voltz_ethereum.cDAI_july31_61days_vamm_evt_Swap 
    union all
    select 
    evt_block_time, variableTokenDelta
    ,   'rETH' as Token
    from voltz_ethereum.rocket_july1_183days_vamm_evt_Swap
    union all
    select 
    evt_block_time, variableTokenDelta
    ,   'stETH' as Token
    from voltz_ethereum.lido_july1_183days_vamm_evt_Swap
    union all
    select
    evt_block_time, variableTokenDelta
    ,   'aETH_borrow_v2' as Token
    from voltz_ethereum.aETH_borrow_september30_182days_vamm_evt_Swap
    union all
    select
    evt_block_time, variableTokenDelta
    ,   'aDAI' as Token
    from voltz_ethereum.aDAI_september30_92days_vamm_evt_Swap
    union all
    select
    evt_block_time, variableTokenDelta
    ,   'aETH' as Token
    from voltz_ethereum.aETH_september30_92days_vamm_evt_Swap
    union all
    SELECT evt_block_time, variableTokenDelta
    , 'cDAI' AS Token
    from voltz_ethereum.cDAI_2_september30_92days_vamm_evt_Swap
    union all
    select evt_block_time, variableTokenDelta
    ,   'aUSDC' as Token
    from voltz_ethereum.aUSDC_2_september30_92days_vamm_evt_Swap
),

notional as (
    select
    date_trunc('day', evt_block_time) as myDate
    ,   Token
    ,   case 
            when Token in ('aUSDC', 'aUSDC_v3', 'aUSDC_borrow', 'cUSDT_borrow','aUSDC_v2') then abs(variableTokenDelta)/1e6
            else abs(variableTokenDelta)/1e18
        end as Notional_Traded
    from pools
),

summ as (
    select myDate
    ,   Token
    ,   sum(Notional_Traded) as Notional_Traded
    from notional
    group by myDate, Token
),

token_dates as (
    select Token, d.col as myDate
    from summ, (select explode(sequence(to_date('2022-06-01'), to_date(now()), interval 1 day)) ) d
    group by Token, d.col
    order by d.col
),

notional_per_day as (
    select
    a.myDate, a.Token
    ,   case
            when Notional_Traded is null then 0
            when b.Token in ('stETH', 'rETH', 'aave_ETH_borrow', 'aETH', 'aETH_borrow_v2') then (Notional_Traded * price)
            else Notional_Traded
        end as Notional_Traded
    from token_dates as a
    left join summ as b
    on a.myDate = b.myDate
        and a.Token = b.Token
    left join ethprice p
    on 1 = 1
), 

result_tokens as (
select 
    a.Token,
    a.myDate as myDate,
    Notional_Traded,
    summ_day,
    summ,
    Notional_Traded/summ as fraction,
    Notional_Traded/summ_day as normalised
from notional_per_day a
left join liq_tick_day b
on a.Token = B.Token and a.myDate = b.myDate
),

result_per_pool as (
 select 
 myDate
 , case 
        when Token = 'aETH_borrow' then fraction
        else 0
    end as fraction_aETH_borrow
, case 
        when Token = 'aUSDC_borrow' then fraction
        else 0
    end as fraction_aUSDC_borrow
 , case 
        when Token = 'aETH_borrow_v2' then fraction
        else 0
    end as fraction_aETH_borrow_v2
, case 
        when Token = 'cUSDT_borrow' then fraction
        else 0
    end as fraction_cUSDT_borrow
 , case 
        when Token = 'rETH' then fraction
        else 0
    end as fraction_rETH
, case 
        when Token = 'stETH' then fraction
        else 0
    end as fraction_stETH
 , case 
        when Token = 'aETH' then fraction
        else 0
    end as fraction_aETH
, case 
        when Token = 'aUSDC' then fraction
        else 0
    end as fraction_aUSDC
 , case 
        when Token = 'cDAI' then fraction
        else 0
    end as fraction_cDAI
, case 
        when Token = 'aDAI' then fraction
        else 0
    end as fraction_aDAI--------
, case 
        when Token = 'aETH_borrow' then normalised
        else 0
    end as normalised_aETH_borrow
, case 
        when Token = 'aUSDC_borrow' then normalised
        else 0
    end as normalised_aUSDC_borrow
 , case 
        when Token = 'aETH_borrow_v2' then normalised
        else 0
    end as normalised_aETH_borrow_v2
, case 
        when Token = 'cUSDT_borrow' then normalised
        else 0
    end as normalised_cUSDT_borrow
 , case 
        when Token = 'rETH' then normalised
        else 0
    end as normalised_rETH
, case 
        when Token = 'stETH' then normalised
        else 0
    end as normalised_stETH
 , case 
        when Token = 'aETH' then normalised
        else 0
    end as normalised_aETH
, case 
        when Token = 'aUSDC' then normalised
        else 0
    end as normalised_aUSDC
 , case 
        when Token = 'cDAI' then normalised
        else 0
    end as normalised_cDAI
, case 
        when Token = 'aDAI' then normalised
        else 0
    end as normalised_aDAI
from result_tokens
)

select 
myDate ,
sum(normalised_aDAI) as normalised_aDAI,
sum(normalised_aETH_borrow) as normalised_aETH_borrow,
sum(normalised_aETH) as normalised_aETH,
sum(normalised_aETH_borrow_v2) as normalised_aETH_borrow_v2,
sum(normalised_aUSDC) as normalised_aUSDC,
sum(normalised_aUSDC_borrow) as normalised_aUSDC_borrow,
sum(normalised_cDAI) as normalised_cDAI,
sum(normalised_cUSDT_borrow) as normalised_cUSDT_borrow,
sum(normalised_rETH) as normalised_rETH,
sum(normalised_stETH) as normalised_stETH, ----
sum(fraction_aDAI) as fraction_aDAI,
sum(fraction_aETH) as fraction_aETH,
sum(fraction_aETH_borrow) as fraction_aETH_borrow,
sum(fraction_aETH_borrow_v2) as fraction_aETH_borrow_v2,
sum(fraction_aUSDC) as fraction_aUSDC,
sum(fraction_aUSDC_borrow) as fraction_aUSDC_borrow,
sum(fraction_cDAI) as fraction_cDAI,
sum(fraction_cUSDT_borrow) as fraction_cUSDT_borrow,
sum(fraction_rETH) as fraction_rETH,
sum(fraction_stETH) as fraction_stETH,
from result_per_pool
group by myDate
